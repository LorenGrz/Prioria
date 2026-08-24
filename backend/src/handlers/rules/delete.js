import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, notFound, serverError } from '../../lib/response.js';

/** Hard delete — the user asked to remove a rule, not mute it (use PUT active:false for that). */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const ruleId = event.pathParameters?.ruleId;

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLES.rules, Key: { userId, ruleId } })
    );
    if (!existing.Item) return notFound('Rule not found');

    await ddb.send(new DeleteCommand({ TableName: TABLES.rules, Key: { userId, ruleId } }));

    return ok({ ruleId, deleted: true });
  } catch (err) {
    return serverError(err);
  }
};
