import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, serverError } from '../../lib/response.js';

/**
 * Weak reinforcement signal: the user opened/expanded the notification.
 * We just record it — the agent reads recent open/feedback history as
 * context next time it scores something from the same sender/category,
 * it does not retroactively change this item's own priority.
 */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const notificationId = event.pathParameters?.id;

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.notifications,
        Key: { userId, notificationId },
        UpdateExpression: 'SET readState = :opened, openedAt = :now',
        ExpressionAttributeValues: { ':opened': 'opened', ':now': new Date().toISOString() },
        ReturnValues: 'ALL_NEW',
      })
    );

    return ok(result.Attributes);
  } catch (err) {
    return serverError(err);
  }
};
