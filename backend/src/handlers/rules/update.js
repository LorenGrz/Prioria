import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, badRequest, notFound, serverError } from '../../lib/response.js';

/**
 * Direct edit of a rule's text and/or active flag — `source` is always
 * server-controlled and never accepted from the body.
 */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const ruleId = event.pathParameters?.ruleId;
    const { ruleText, active } = JSON.parse(event.body || '{}');

    if (ruleText === undefined && active === undefined) {
      return badRequest('Provide ruleText and/or active');
    }

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLES.rules, Key: { userId, ruleId } })
    );
    if (!existing.Item) return notFound('Rule not found');

    const sets = ['updatedAt = :now'];
    const values = { ':now': new Date().toISOString() };
    if (ruleText !== undefined) {
      sets.push('ruleText = :ruleText');
      values[':ruleText'] = ruleText;
    }
    if (active !== undefined) {
      sets.push('active = :active');
      values[':active'] = active;
    }

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.rules,
        Key: { userId, ruleId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })
    );

    return ok(result.Attributes);
  } catch (err) {
    return serverError(err);
  }
};
