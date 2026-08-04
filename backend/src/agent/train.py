"""
POST /train — backs the "Entrenar" chat screen. Turns a free-text message
from the user into a concise rule stored in RulesTable, which
process_notification.py then treats as higher-priority context than its
own judgment.
"""

import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from strands import Agent
from strands.models import BedrockModel

dynamodb = boto3.resource("dynamodb")
rules_table = dynamodb.Table(os.environ["RULES_TABLE"])

MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-5-haiku-20241022-v1:0")

SYSTEM_PROMPT = """\
Sos el asistente de configuración de Prioria. El usuario te escribe en \
lenguaje natural cómo quiere que se prioricen sus notificaciones (por \
ejemplo: "solo avisame de transferencias superiores a $50k"). Convertí ese \
mensaje en una regla concisa y accionable, en español, en una sola oración, \
que el motor de priorización pueda aplicar literalmente. Respondé solo con \
la regla en texto plano, sin comillas ni texto adicional.\
"""


def handler(event, context):
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        user_id = claims["sub"]
    except KeyError:
        return _response(401, {"error": "Missing authenticated user context"})

    body = json.loads(event.get("body") or "{}")
    message = (body.get("message") or "").strip()
    if not message:
        return _response(400, {"error": "message is required"})

    rule_text = _distill_rule(message)

    item = {
        "userId": user_id,
        "ruleId": str(uuid.uuid4()),
        "ruleText": rule_text,
        "sourceMessage": message,
        "active": True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    rules_table.put_item(Item=item)

    reply = f"Entendido. He actualizado tus reglas de filtrado: {rule_text}"
    return _response(201, {"rule": item, "reply": reply})


def _distill_rule(message):
    model = BedrockModel(model_id=MODEL_ID, temperature=0.2)
    agent = Agent(model=model, system_prompt=SYSTEM_PROMPT)
    response = agent(message)
    return str(response).strip().strip('"')


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }
