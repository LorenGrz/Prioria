import { randomUUID } from 'crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { created, badRequest, serverError } from '../../lib/response.js';

/** Lets the user add a rule directly from Filtros, no chat roundtrip needed. */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const { ruleText } = JSON.parse(event.body || '{}');

    if (typeof ruleText !== 'string' || !ruleText.trim()) {
      return badRequest('ruleText is required');
    }

    const item = {
      userId,
      ruleId: randomUUID(),
      ruleText: ruleText.trim(),
      source: 'manual',
      active: true,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLES.rules, Item: item }));

    return created({ rule: item });
  } catch (err) {
    return serverError(err);
  }
};
