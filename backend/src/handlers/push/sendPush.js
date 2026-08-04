import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { GoogleAuth } from 'google-auth-library';
import { ddb, TABLES } from '../../lib/dynamo.js';

const secretsClient = new SecretsManagerClient({});
let cachedAuth; // reused across warm invocations

async function getFcmAccessToken() {
  if (!cachedAuth) {
    const secret = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: process.env.FCM_SERVICE_ACCOUNT_SECRET_ARN })
    );
    const credentials = JSON.parse(secret.SecretString);
    cachedAuth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }
  const client = await cachedAuth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

/**
 * Consumes PushQueue. One message per "this notification cleared the
 * user's priority threshold" event, produced by process_notification.py.
 * Talks to FCM's HTTP v1 API directly (no Expo push service dependency,
 * since NotificationListenerService requires a bare/dev-client build
 * anyway) so the widget gets a real-time update instead of polling.
 */
export const handler = async (event) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const { userId, notificationId, title, body, priorityLabel } = JSON.parse(record.body);

      const user = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { userId } }));
      const fcmToken = user.Item?.fcmToken;
      if (!fcmToken) {
        console.warn(`No FCM token registered for user ${userId}, skipping push`);
        continue;
      }

      const accessToken = await getFcmAccessToken();
      const projectId = process.env.FCM_PROJECT_ID;

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: fcmToken,
              notification: { title, body },
              data: {
                notificationId,
                priorityLabel: priorityLabel ?? 'critica',
                // The widget reads this to decide whether to surface it
                // and the app reads it to trigger the brief "boost" flow.
              },
              android: { priority: 'high' },
            },
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`FCM send failed (${res.status}): ${text}`);
      }

      await ddb.send(
        new UpdateCommand({
          TableName: TABLES.notifications,
          Key: { userId, notificationId },
          UpdateExpression: 'SET pushedAt = :now',
          ExpressionAttributeValues: { ':now': new Date().toISOString() },
        })
      );
    } catch (err) {
      console.error('Push delivery failed for record', record.messageId, err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
