"""
SQS-triggered Lambda: scores each ingested notification with a Strands
Agent backed by Bedrock, then writes the verdict back to DynamoDB and
(if it clears the user's threshold) enqueues a push to PushQueue.

NOTE: the exact Agent/BedrockModel constructor signature below follows the
public strands-agents docs as of this writing. Since the SDK is young and
moves fast, diff this against LorenGrz/simple-agent before deploying —
that repo is the source of truth for "our" Strands conventions.
"""

import json
import os
import re
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from strands import Agent
from strands.models import BedrockModel

dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

notifications_table = dynamodb.Table(os.environ["NOTIFICATIONS_TABLE"])
users_table = dynamodb.Table(os.environ["USERS_TABLE"])
rules_table = dynamodb.Table(os.environ["RULES_TABLE"])

MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-5-haiku-20241022-v1:0")

SYSTEM_PROMPT = """\
Sos el motor de priorización de Prioria, una app que protege la atención de \
trabajadores que no pueden mirar el celular constantemente (choferes, \
supervisores de logística, personal de campo). Tu única salida debe ser un \
objeto JSON, sin texto adicional ni markdown, con esta forma exacta:

{"priority_score": <entero 0-100>, "category": "<bancos|pagos|trabajo|seguridad|clientes|entregas|otro>", \
"label": "<critica|aviso|info>", "should_auto_read": <true|false>, "reasoning": "<motivo breve>"}

Reglas de puntaje:
- 75-100 (critica): riesgo de seguridad, plata en juego, jefes o clientes pidiendo \
algo con deadline inmediato, o coincide con una regla explícita del usuario.
- 45-74 (aviso): relevante pero no urgente, no interrumpe.
- 0-44 (info): puede esperar al resumen diario.

Las reglas explícitas del usuario (definidas en el chat "Entrenar") siempre \
pesan más que tu propio criterio: si una notificación coincide claramente con \
una regla, respetala aunque tu instinto diga lo contrario. should_auto_read \
debe ser true solo para el rango "critica".\
"""


def handler(event, context):
    batch_item_failures = []

    for record in event["Records"]:
        try:
            _process_record(record)
        except Exception as exc:  # noqa: BLE001 — surface as a partial batch failure
            print(f"Failed to process record {record.get('messageId')}: {exc}")
            batch_item_failures.append({"itemIdentifier": record["messageId"]})

    return {"batchItemFailures": batch_item_failures}


def _process_record(record):
    body = json.loads(record["body"])
    user_id = body["userId"]
    notification_id = body["notificationId"]

    notification = notifications_table.get_item(
        Key={"userId": user_id, "notificationId": notification_id}
    ).get("Item")
    if not notification:
        print(f"Notification {notification_id} for {user_id} no longer exists, skipping")
        return

    user_record = users_table.get_item(Key={"userId": user_id}).get("Item", {})
    preferences = user_record.get("preferences", {})

    rules = rules_table.query(
        KeyConditionExpression="userId = :u",
        ExpressionAttributeValues={":u": user_id},
    ).get("Items", [])
    active_rules = [r["ruleText"] for r in rules if r.get("active", True)]

    verdict = _score_notification(notification, preferences, active_rules)

    notifications_table.update_item(
        Key={"userId": user_id, "notificationId": notification_id},
        UpdateExpression=(
            "SET #s = :status, priorityScore = :score, priorityLabel = :label, "
            "category = :category, autoRead = :auto_read, agentReasoning = :reasoning, "
            "processedAt = :now"
        ),
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":status": "processed",
            ":score": Decimal(str(verdict["priority_score"])),
            ":label": verdict["label"],
            ":category": verdict["category"],
            ":auto_read": verdict["should_auto_read"],
            ":reasoning": verdict["reasoning"],
            ":now": datetime.now(timezone.utc).isoformat(),
        },
    )

    # priorityThreshold is 1-10 from onboarding's slider; scores are 0-100.
    threshold = preferences.get("priorityThreshold", 8) * 10
    if verdict["priority_score"] >= threshold:
        sqs.send_message(
            QueueUrl=os.environ["PUSH_QUEUE_URL"],
            MessageBody=json.dumps(
                {
                    "userId": user_id,
                    "notificationId": notification_id,
                    "title": notification["title"],
                    "body": notification.get("body", ""),
                    "priorityLabel": verdict["label"],
                    "autoRead": verdict["should_auto_read"],
                }
            ),
        )


def _score_notification(notification, preferences, active_rules):
    model = BedrockModel(model_id=MODEL_ID, temperature=0.1)
    agent = Agent(model=model, system_prompt=SYSTEM_PROMPT)

    user_context = {
        "sender": notification.get("sourceApp"),
        "title": notification.get("title"),
        "body": notification.get("body"),
        "sensitivity_0_100": preferences.get("sensitivity", 85),
        "enabled_categories": [k for k, v in preferences.get("categories", {}).items() if v],
        "explicit_rules": active_rules,
    }

    response = agent(json.dumps(user_context, ensure_ascii=False))
    raw_text = str(response)

    try:
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        verdict = json.loads(match.group(0) if match else raw_text)
        verdict["priority_score"] = max(0, min(100, int(verdict["priority_score"])))
        verdict.setdefault("category", "otro")
        verdict.setdefault("label", "aviso")
        verdict.setdefault("should_auto_read", False)
        verdict.setdefault("reasoning", "")
        return verdict
    except Exception:
        print(f"Could not parse agent output, falling back to safe default: {raw_text!r}")
        return {
            "priority_score": 50,
            "category": "otro",
            "label": "aviso",
            "should_auto_read": False,
            "reasoning": "fallback: no se pudo interpretar la respuesta del agente",
        }
