# Prioria backend

Serverless AWS stack (SAM) for notification ingestion, agent-based
prioritization, history/feedback, TTS and push delivery. Deploy to your own
AWS account — this template defines its own IAM roles, it does not reuse
any permissions-boundary ARN from a workshop/sandbox account.

## Architecture

```
Android NotificationListenerService
        │  POST /notifications (Cognito-authenticated)
        ▼
IngestNotificationFunction ──writes──▶ NotificationsTable (status=pending)
        │
        ▼ SQS: NotificationQueue
        │
ProcessNotificationFunction (Python, Strands Agent + Bedrock)
        │  scores priority using: notification content, user preferences,
        │  explicit rules from the "Entrenar" chat
        ▼
NotificationsTable (status=processed, priorityScore, priorityLabel)
        │
        │  if priorityScore >= user's threshold
        ▼ SQS: PushQueue
        │
SendPushFunction ──FCM HTTP v1──▶ device (widget shows it)

Feedback loop:
  open      -> weak signal   (readState=opened, logged for the agent's context)
  feedback  -> strong signal (thumb up/down, ± the item's own score)
  boost     -> medium signal (brief app-open from the widget, +score, boostCount++)
```

Two Lambda runtimes on purpose: the CRUD/API Lambdas are Node.js 20, the two
agent Lambdas (`process_notification.py`, `train.py`) are Python 3.13
because the Strands Agents SDK is Python-native. Keep that split when
adding functions — don't try to force the agent logic into Node.

## Prerequisites

1. AWS SAM CLI, Node 20, Python 3.13, an AWS account with Bedrock model
   access requested/enabled for `BedrockModelId` (default: Claude 3.5 Haiku)
   in your target region.
2. A Firebase project for Android push. Create a service account with the
   "Firebase Cloud Messaging API" role, download its JSON key, and store it
   **before** deploying:

   ```bash
   aws secretsmanager create-secret \
     --name prioria/fcm-service-account \
     --secret-string file://service-account.json
   ```

   Pass the resulting ARN as `FcmServiceAccountSecretArn`, and the Firebase
   project ID as `FcmProjectId`, at deploy time.

## Deploy

```bash
cd backend
npm install         # node deps for esbuild bundling
sam build
sam deploy --guided \
  --parameter-overrides \
    FcmServiceAccountSecretArn=arn:aws:secretsmanager:... \
    FcmProjectId=your-firebase-project-id
```

`sam deploy --guided` will prompt for and remember the rest (stack name,
region, `Stage`). Re-run plain `sam deploy` after the first guided run.

## Outputs you'll need in the mobile app

- `ApiUrl` — base URL for all REST calls
- `UserPoolId` / `UserPoolClientId` — for Cognito SRP auth (amazon-cognito-identity-js
  or Amplify Auth) in the RN app
- `VoiceClipsBucketName` — informational only, the app never talks to S3 directly,
  it just consumes the presigned URL `/voice/synthesize` returns

## Notes / open decisions

- **Voice IDs**: the Voz screen's "Lucía"/"Enrique" map 1:1 to Polly's real
  `Lucia` (neural, es-ES) and `Enrique` (standard only, es-ES) voices — no
  translation layer needed beyond `src/handlers/voice/synthesize.js`.
- **Push transport**: FCM HTTP v1 directly from Lambda, not Expo's push
  service — chosen because NotificationListenerService requires a bare/dev
  client build anyway, so there's no Expo Go constraint pulling us toward
  Expo's push infra.
- **Training data feedback loop**: `open`/`feedback`/`boost` all land in
  `NotificationsTable`. The agent Lambda currently only reads the explicit
  `RulesTable` as high-weight context; wiring recent feedback history into
  the same prompt (in-context learning) is the natural next step once
  there's enough signal volume to matter — not built yet.
