import {
  ScanCommand,
  QueryCommand,
  GetCommand,
  TransactWriteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { labelForScore } from '../../lib/scoring.js';

const TARGET_AGE_DAYS = 30;
const MAX_BACKLOG_DAYS = 10; // matches the TTL safety-net buffer in ingest.js
const DAY_MS = 24 * 60 * 60 * 1000;
const LABEL_ES = { critica: 'crítica', aviso: 'aviso', info: 'informativa' };

/**
 * Weekly housekeeping: notifications are meant to live ~30 days. Rather than
 * just letting DynamoDB's TTL silently delete them (see NOTIFICATION_TTL_SECONDS
 * in ingest.js), this folds each day's expiring notifications into a running
 * per-(category, sourceApp) rule in RulesTable — so the learned pattern
 * survives even though the raw notification doesn't — then hard-deletes the
 * originals. This is deliberately coarser than the explicit rules a user
 * writes in Entrenar (which can target a specific sender); this is only a
 * background fallback for combinations with no explicit rule.
 */
export const handler = async () => {
  const userIds = await scanDistinctUserIds();
  const results = [];

  for (const userId of userIds) {
    try {
      results.push(await archiveForUser(userId));
    } catch (err) {
      console.error(`archive failed for user ${userId}`, err);
      results.push({ userId, error: String(err) });
    }
  }

  return { processedUsers: results.length, results };
};

// UsersTable only gets a row when a user registers a device or saves
// preferences (see devices/register.js, preferences/update.js) — it is NOT
// a reliable list of "everyone with notifications". NotificationsTable's
// partition key IS userId, so scanning it for distinct values is the only
// correct way to find every user who might have data to archive.
async function scanDistinctUserIds() {
  const userIds = new Set();
  let ExclusiveStartKey;
  do {
    const page = await ddb.send(
      new ScanCommand({
        TableName: TABLES.notifications,
        ProjectionExpression: 'userId',
        ExclusiveStartKey,
      })
    );
    for (const item of page.Items ?? []) userIds.add(item.userId);
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return [...userIds];
}

async function archiveForUser(userId) {
  const watermark = await ddb.send(
    new GetCommand({
      TableName: TABLES.users,
      Key: { userId },
      ProjectionExpression: 'lastArchivedDate',
    })
  );
  const lastArchivedDate = watermark.Item?.lastArchivedDate ?? null;

  const today30 = isoDate(new Date(Date.now() - TARGET_AGE_DAYS * DAY_MS));
  const earliestStart = isoDate(new Date(Date.now() - (TARGET_AGE_DAYS + MAX_BACKLOG_DAYS - 1) * DAY_MS));
  const start = lastArchivedDate
    ? maxDate(addDays(lastArchivedDate, 1), earliestStart)
    : today30;

  if (start > today30) return { userId, daysProcessed: 0 };

  let day = start;
  let daysProcessed = 0;
  while (day <= today30) {
    await archiveDay(userId, day);
    daysProcessed += 1;
    day = addDays(day, 1);
  }
  return { userId, daysProcessed };
}

async function archiveDay(userId, day) {
  const items = await queryDay(userId, day);

  if (items.length > 0) {
    const groups = groupByCategoryAndApp(items);
    const rulePuts = [];
    for (const group of groups) {
      rulePuts.push(await buildRulePut(userId, group));
    }

    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          ...rulePuts.map((Item) => ({ Put: { TableName: TABLES.rules, Item } })),
          {
            Update: {
              TableName: TABLES.users,
              Key: { userId },
              UpdateExpression: 'SET lastArchivedDate = :day',
              ConditionExpression: 'attribute_not_exists(lastArchivedDate) OR lastArchivedDate <> :day',
              ExpressionAttributeValues: { ':day': day },
            },
          },
        ],
      })
    ).catch((err) => {
      // A condition failure means another run already folded this exact day
      // for this user — treat as already-archived and fall through to the
      // delete step below (safe: deleting already-gone keys is a no-op).
      if (err.name !== 'TransactionCanceledException') throw err;
    });

    await hardDeleteItems(items);
  } else {
    // Nothing to archive, but still advance the watermark so this day isn't
    // re-queried forever.
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLES.users,
              Key: { userId },
              UpdateExpression: 'SET lastArchivedDate = :day',
              ConditionExpression: 'attribute_not_exists(lastArchivedDate) OR lastArchivedDate <> :day',
              ExpressionAttributeValues: { ':day': day },
            },
          },
        ],
      })
    ).catch((err) => {
      if (err.name !== 'TransactionCanceledException') throw err;
    });
  }
}

async function queryDay(userId, day) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const page = await ddb.send(
      new QueryCommand({
        TableName: TABLES.notifications,
        IndexName: 'byCreatedAt',
        KeyConditionExpression: 'userId = :u AND begins_with(createdAt, :day)',
        ExpressionAttributeValues: { ':u': userId, ':day': day },
        ExclusiveStartKey,
      })
    );
    items.push(...(page.Items ?? []));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

function groupByCategoryAndApp(items) {
  const map = new Map();
  for (const item of items) {
    const category = item.category ?? 'otro';
    const sourceApp = item.sourceApp ?? 'desconocida';
    const key = `${category}::${sourceApp}`;
    if (!map.has(key)) map.set(key, { category, sourceApp, items: [] });
    map.get(key).items.push(item);
  }
  return [...map.values()];
}

async function buildRulePut(userId, { category, sourceApp, items }) {
  const ruleId = `auto-${category}-${sourceApp}`;
  const existing = await ddb.send(
    new GetCommand({ TableName: TABLES.rules, Key: { userId, ruleId } })
  );

  const priorScoreSum = existing.Item?.scoreSum ?? 0;
  const priorCount = existing.Item?.sampleCount ?? 0;
  const batchSum = items.reduce((sum, item) => sum + (item.priorityScore ?? 0), 0);

  const sampleCount = priorCount + items.length;
  const scoreSum = priorScoreSum + batchSum;
  const avgPriorityScore = Math.round(scoreSum / sampleCount);
  const label = LABEL_ES[labelForScore(avgPriorityScore)];
  const now = new Date().toISOString();

  return {
    userId,
    ruleId,
    category,
    sourceApp,
    ruleText: `Las notificaciones de tipo '${category}' desde ${sourceApp} fueron históricamente mayormente '${label}' (${avgPriorityScore}/100 en promedio, sobre ${sampleCount} notificaciones).`,
    active: true,
    source: 'auto-archive',
    sampleCount,
    scoreSum,
    avgPriorityScore,
    createdAt: existing.Item?.createdAt ?? now,
    updatedAt: now,
  };
}

async function hardDeleteItems(items) {
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) chunks.push(items.slice(i, i + 25));

  for (const chunk of chunks) {
    let RequestItems = {
      [TABLES.notifications]: chunk.map(({ userId, notificationId }) => ({
        DeleteRequest: { Key: { userId, notificationId } },
      })),
    };
    // eslint-disable-next-line no-await-in-loop
    while (Object.keys(RequestItems).length) {
      const res = await ddb.send(new BatchWriteCommand({ RequestItems }));
      if (!res.UnprocessedItems || Object.keys(res.UnprocessedItems).length === 0) break;
      RequestItems = res.UnprocessedItems;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dayString, n) {
  const d = new Date(`${dayString}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

function maxDate(a, b) {
  return a > b ? a : b;
}
