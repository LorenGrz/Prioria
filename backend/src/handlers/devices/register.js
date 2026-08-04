import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, badRequest, serverError } from '../../lib/response.js';

/** Saves the FCM registration token so the push Lambda knows where to deliver. */
export const handler = async (event) => {
  try {
    const { userId, email } = getUser(event);
    const { fcmToken, platform } = JSON.parse(event.body || '{}');

    if (!fcmToken) return badRequest('fcmToken is required');

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.users,
        Key: { userId },
        UpdateExpression:
          'SET fcmToken = :token, platform = :platform, email = :email, deviceUpdatedAt = :now',
        ExpressionAttributeValues: {
          ':token': fcmToken,
          ':platform': platform ?? 'android',
          ':email': email,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return ok({ registered: true, platform: result.Attributes.platform });
  } catch (err) {
    return serverError(err);
  }
};
