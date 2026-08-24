import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, badRequest, notFound, serverError } from '../../lib/response.js';
import { clampScore, labelForScore } from '../../lib/scoring.js';

// Representative score for each label when the user picks one explicitly
// (Historial's Urgente/Normal/Info chips) — must land inside the band
// labelForScore assigns back to that same label, so the picked chip sticks.
const BAND_SCORE = { critica: 90, aviso: 60, info: 20 };

/**
 * Strong reinforcement signal from the Historial screen, in one of two shapes:
 *  - { priority: 'critica'|'aviso'|'info' } — the user tapped a specific chip,
 *    so the score is set directly to that band's representative value.
 *  - { feedback: 'up'|'down' } — legacy coarse nudge (±15), kept for callers
 *    that just want "more/less important" without picking an exact label.
 * Both correct the item's own score and — via sourceApp/category — become
 * context the agent reads for future scoring of the same kind of alert
 * (see process_notification.py).
 */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const notificationId = event.pathParameters?.id;
    const { feedback, priority } = JSON.parse(event.body || '{}');

    if (priority !== undefined && !['critica', 'aviso', 'info'].includes(priority)) {
      return badRequest('priority must be "critica", "aviso" or "info"');
    }
    if (priority === undefined && !['up', 'down'].includes(feedback)) {
      return badRequest('feedback must be "up" or "down" (or pass priority instead)');
    }

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLES.notifications, Key: { userId, notificationId } })
    );
    if (!existing.Item) return notFound('Notification not found');

    const nextScore = priority !== undefined
      ? BAND_SCORE[priority]
      : clampScore((existing.Item.priorityScore ?? 50) + (feedback === 'up' ? 15 : -15));

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.notifications,
        Key: { userId, notificationId },
        UpdateExpression:
          'SET feedback = :feedback, feedbackAt = :now, priorityScore = :score, priorityLabel = :label',
        ExpressionAttributeValues: {
          ':feedback': priority ?? feedback,
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
