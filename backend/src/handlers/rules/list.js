import { randomUUID } from 'crypto';
import { BatchWriteCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, serverError } from '../../lib/response.js';
import { DEFAULT_RULES } from '../../lib/defaultRules.js';

/**
 * Powers the "Reglas de Filtrado" list. Rules land in this table from three
 * writers (chat via train.py, the weekly archive job, and this feature's
 * own create/update endpoints) that don't all stamp the same `source` —
 * infer it for older rows so the UI can still group them sensibly.
 */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);

    let items = await queryRules(userId);

    if (items.length === 0) {
      const user = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { userId } }));
      if (!user.Item?.defaultRulesSeeded) {
        items = await seedDefaultRules(userId);
      }
    }

    return ok({ items: items.map(withInferredSource) });
  } catch (err) {
    return serverError(err);
  }
};

async function queryRules(userId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLES.rules,
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    })
  );
  return result.Items ?? [];
}

async function seedDefaultRules(userId) {
  const now = new Date().toISOString();
  const items = DEFAULT_RULES.map((ruleText) => ({
    userId,
    ruleId: randomUUID(),
    ruleText,
    source: 'default',
    active: true,
    createdAt: now,
  }));

  await ddb.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLES.rules]: items.map((Item) => ({ PutRequest: { Item } })),
      },
    })
  );

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLES.users,
        Key: { userId },
        UpdateExpression: 'SET defaultRulesSeeded = :true',
        ConditionExpression: 'attribute_not_exists(defaultRulesSeeded)',
        ExpressionAttributeValues: { ':true': true },
      })
    );
  } catch (err) {
    // A concurrent request already seeded — the rules themselves are still
    // valid to return, just don't treat this as a failure.
    if (err.name !== 'ConditionalCheckFailedException') throw err;
  }

  return items;
}

function withInferredSource(item) {
  if (item.source) return item;
  const source = item.ruleId?.startsWith('auto-')
    ? 'auto-archive'
    : item.sourceMessage
      ? 'chat'
      : 'manual';
  return { ...item, source };
}
