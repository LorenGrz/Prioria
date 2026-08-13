import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, notFound, serverError } from '../../lib/response.js';

/** Soft-delete: marks a notification as deleted so it no longer appears in history. */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const notificationId = event.pathParameters?.id;

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLES.notifications, Key: { userId, notificationId } })
    );
    if (!existing.Item) return notFound('Notification not found');

    await ddb.send(
      new UpdateCommand({
        TableName: TABLES.notifications,
        Key: { userId, notificationId },
        UpdateExpression: 'SET #s = :deleted, deletedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':deleted': 'deleted',
          ':now': new Date().toISOString(),
        },
      })
    );

    return ok({ notificationId, deleted: true });
  } catch (err) {
    return serverError(err);
  }
};
