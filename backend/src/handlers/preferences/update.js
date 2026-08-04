import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, badRequest, serverError } from '../../lib/response.js';

/**
 * Partial update — the app only sends the slice of preferences that
 * changed (e.g. just `{ sensitivity: 60 }` from the Filtros slider). We
 * read-merge-write rather than trying to build a dynamic nested
 * UpdateExpression, since the shape of `preferences` is a free-form map.
 */
export const handler = async (event) => {
  try {
    const { userId, email } = getUser(event);
    const patch = JSON.parse(event.body || '{}');

    if (typeof patch !== 'object' || Array.isArray(patch) || patch === null) {
      return badRequest('Body must be a preferences object');
    }

    const existing = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { userId } }));
    const merged = { ...(existing.Item?.preferences ?? {}), ...patch };

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.users,
        Key: { userId },
        UpdateExpression: 'SET preferences = :merged, email = :email, updatedAt = :now',
        ExpressionAttributeValues: {
          ':merged': merged,
          ':email': email,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return ok(result.Attributes.preferences);
  } catch (err) {
    return serverError(err);
  }
};
