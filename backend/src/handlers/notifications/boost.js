import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, notFound, serverError } from '../../lib/response.js';
import { clampScore, labelForScore } from '../../lib/scoring.js';

const BOOST_AMOUNT = 8;

/**
 * Medium signal: the user tapped the widget and briefly opened the app
 * while this was the most recent notification. Unlike `open`, this one
 * does bump the item's live priority — that's the whole point of the
 * widget interaction per spec.
 */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const notificationId = event.pathParameters?.id;

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLES.notifications, Key: { userId, notificationId } })
    );
    if (!existing.Item) return notFound('Notification not found');

    const nextScore = clampScore((existing.Item.priorityScore ?? 50) + BOOST_AMOUNT);

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.notifications,
        Key: { userId, notificationId },
        UpdateExpression:
          'SET priorityScore = :score, priorityLabel = :label, boostCount = if_not_exists(boostCount, :zero) + :one, lastBoostAt = :now',
        ExpressionAttributeValues: {
          ':score': nextScore,
          ':label': labelForScore(nextScore),
          ':zero': 0,
          ':one': 1,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return ok(result.Attributes);
  } catch (err) {
    return serverError(err);
  }
};
