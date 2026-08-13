import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, serverError } from '../../lib/response.js';

/** Powers the Historial screen. Newest first, optional status filter. */
export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const status = event.queryStringParameters?.status; // 'pending' | 'processed'

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLES.notifications,
        IndexName: 'byCreatedAt',
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: {
          ':u': userId,
          ':deleted': 'deleted',
          ...(status ? { ':status': status } : {}),
        },
        ExpressionAttributeNames: { '#s': 'status' },
        FilterExpression: status
          ? '#s = :status'
          : '#s <> :deleted',
        ScanIndexForward: false,
        Limit: 50,
      })
    );

    return ok({ items: result.Items ?? [] });
  } catch (err) {
    return serverError(err);
  }
};
