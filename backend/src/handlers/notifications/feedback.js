import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, badRequest, notFound, serverError } from '../../lib/response.js';
import { clampScore, labelForScore } from '../../lib/scoring.js';

/**
 * Strong reinforcement signal: explicit thumbs up ("era importante") or
 * thumbs down ("no era importante") from the Historial screen. This both
 * corrects the item's own score and — via the notification's sourceApp/
 * category — becomes context the agent reads for future scoring of the
 * same kind of alert (see process_notification.py).
 */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const notificationId = event.pathParameters?.id;
    const { feedback } = JSON.parse(event.body || '{}');

    if (!['up', 'down'].includes(feedback)) {
      return badRequest('feedback must be "up" or "down"');
    }

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLES.notifications, Key: { userId, notificationId } })
    );
    if (!existing.Item) return notFound('Notification not found');

    const delta = feedback === 'up' ? 15 : -15;
    const nextScore = clampScore((existing.Item.priorityScore ?? 50) + delta);

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.notifications,
        Key: { userId, notificationId },
        UpdateExpression:
          'SET feedback = :feedback, feedbackAt = :now, priorityScore = :score, priorityLabel = :label',
        ExpressionAttributeValues: {
          ':feedback': feedback,
          ':now': new Date().toISOString(),
          ':score': nextScore,
          ':label': labelForScore(nextScore),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return ok(result.Attributes);
  } catch (err) {
    return serverError(err);
  }
};
