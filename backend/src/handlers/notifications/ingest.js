import { randomUUID } from 'crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { created, badRequest, serverError } from '../../lib/response.js';

const sqs = new SQSClient({});
// Primary retention is the weekly ArchiveNotificationsFunction (30-day
// target, see archive.js): it folds each day's notifications into a
// RulesTable rule before hard-deleting them. This TTL is a failsafe only —
// if that job is broken for a while, DynamoDB's passive TTL still cleans up
// raw data, with a 10-day buffer matching archive.js's own backlog cap so
// the job has room to catch up before TTL beats it to the punch.
const NOTIFICATION_TTL_SECONDS = 40 * 24 * 60 * 60;

/**
 * Entry point for the Android NotificationListenerService: every captured
 * notification lands here first, gets persisted as "pending", and is
 * handed to the queue for the agent to score. Ingestion is intentionally
 * dumb/fast — all prioritization logic lives in the agent Lambda so this
 * endpoint stays cheap even under a burst of notifications.
 */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const payload = JSON.parse(event.body || '{}');

    if (!payload.title || !payload.sourceApp) {
      return badRequest('title and sourceApp are required');
    }

    const notificationId = randomUUID();
    const now = new Date().toISOString();

    const item = {
      userId,
      notificationId,
      sourceApp: payload.sourceApp, // e.g. "com.whatsapp", "com.mercadopago"
      title: payload.title,
      body: payload.body ?? '',
      category: payload.category ?? null, // filled in by the agent if omitted
      status: 'pending', // pending -> processed
      priorityScore: null,
      priorityLabel: null,
      readState: 'unread', // unread | opened | dismissed
      feedback: null, // 'up' | 'down' | null — strong signal
      boostCount: 0, // brief app-opens while this was the latest — medium signal
      createdAt: now,
      processedAt: null,
      expiresAt: Math.floor(Date.now() / 1000) + NOTIFICATION_TTL_SECONDS,
    };

    await ddb.send(new PutCommand({ TableName: TABLES.notifications, Item: item }));

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.NOTIFICATION_QUEUE_URL,
        MessageBody: JSON.stringify({ userId, notificationId }),
      })
    );

    return created(item);
  } catch (err) {
    if (err.statusCode) return badRequest(err.message);
    return serverError(err);
  }
};
