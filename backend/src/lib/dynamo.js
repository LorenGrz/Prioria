import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLES = {
  users: process.env.USERS_TABLE,
  notifications: process.env.NOTIFICATIONS_TABLE,
  rules: process.env.RULES_TABLE,
};
