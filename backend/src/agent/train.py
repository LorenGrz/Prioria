"""
POST /train — backs the "Entrenar" chat screen. Turns a free-text message
from the user into a concise rule; the client persists it locally and sends
it back as part of `activeRules` on future classify calls (see classify.py).
Stateless — no DynamoDB.
"""

import json
import os

from strands import Agent
from strands.models import BedrockModel

MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-5-haiku-20241022-v1:0")

MAX_MESSAGE_LEN = 500
MAX_RULE_LEN = 300

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
        claims["sub"]  # presence-only check — this endpoint has no per-user data to scope
    except KeyError:
        return _response(401, {"error": "Missing authenticated user context"})

    body = json.loads(event.get("body") or "{}")
    message = (body.get("message") or "").strip()
    if not message:
        return _response(400, {"error": "message is required"})
    if len(message) > MAX_MESSAGE_LEN:
        return _response(400, {"error": f"message must be at most {MAX_MESSAGE_LEN} characters"})

    rule_text = _distill_rule(message)[:MAX_RULE_LEN]

    reply = f"Entendido. He actualizado tus reglas de filtrado: {rule_text}"
    return _response(200, {"rule": rule_text, "reply": reply})


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
