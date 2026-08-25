import { NativeModules } from 'react-native';
import { apiCall } from './api';
import type { Preferences } from '../lib/storage/preferences';
import type { NotifPriority } from '../lib/storage/notifications';

export type ClassifyVerdict = {
  priorityScore: number;
  category: string;
  label: Exclude<NotifPriority, null>;
  autoRead: boolean;
  reasoning: string;
};

type ClassifyInput = {
  title: string;
  body: string;
  sourceApp: string;
  preferences: Preferences;
  activeRules: string[];
  token: string;
};

// No more SQS to smooth out a burst of notifications arriving at once —
// cap how many classify calls are in flight so a burst can't pile up
// concurrent cold Bedrock invocations or trip the API's throttle.
const MAX_CONCURRENT = 3;
let inFlight = 0;
const waiters: Array<() => void> = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    waiters.shift()?.();
  }
}

async function getFcmToken(): Promise<string | undefined> {
  try {
    const token = await NativeModules.NotificationModule?.getFcmToken?.();
    return token || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Classifies a notification via the backend's stateless POST /notifications
 * (Bedrock, no DynamoDB — see backend/src/agent/classify.py). Replaces the
 * old ingest-then-poll flow: the verdict comes back synchronously here.
 */
export async function classifyNotification(input: ClassifyInput): Promise<ClassifyVerdict> {
  return withConcurrencyLimit(async () => {
    const fcmToken = await getFcmToken();
    const payload = {
      title: input.title,
      body: input.body,
      sourceApp: input.sourceApp,
      preferences: input.preferences,
      activeRules: input.activeRules,
      ...(fcmToken ? { fcmToken } : {}),
    };
    try {
      return await apiCall<ClassifyVerdict>('/notifications', 'POST', payload, input.token);
    } catch {
      // One retry with a short backoff — there's no SQS/DLQ safety net
      // server-side anymore, so this is the only resilience left.
      await new Promise((resolve) => setTimeout(resolve, 800));
      return apiCall<ClassifyVerdict>('/notifications', 'POST', payload, input.token);
    }
  });
}
