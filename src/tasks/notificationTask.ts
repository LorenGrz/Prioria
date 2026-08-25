import { NativeModules } from 'react-native';
import { getValidAccessToken } from '../lib/authToken';
import { getPreferences } from '../lib/storage/preferences';
import { getActiveRuleTexts } from '../lib/storage/rules';
import { getAllNotifications, saveNotifications, type NotifEntry } from '../lib/storage/notifications';
import { classifyNotification } from '../services/classify';

export type HeadlessNotificationData = {
  packageName: string;
  appName: string;
  title: string;
  body: string;
  timestamp: number;
};

/**
 * Registered as a HeadlessJsTask (see index.ts) — runs when
 * PrioriaNotificationListener.kt sees a notification while there's no live
 * React instance (app closed/killed, not just backgrounded). No mounted
 * component tree here, so this can't use NotificationContext/hooks — it
 * talks to the same storage modules and services NotificationContext uses
 * directly, and whatever it writes to AsyncStorage is what NotificationContext
 * loads on its next mount.
 */
export default async function notificationTask(data: HeadlessNotificationData): Promise<void> {
  const [token, existing] = await Promise.all([getValidAccessToken(), getAllNotifications()]);

  const entry: NotifEntry = {
    id: `${data.packageName}-${data.timestamp}`,
    title: data.title,
    body: data.body,
    appName: data.appName,
    packageName: data.packageName,
    receivedAt: new Date(data.timestamp),
    source: 'system',
    priority: null,
    priorityScore: null,
  };

  // No session to classify with (logged out, or the refresh token itself
  // died) — still record the notification locally, just unclassified by
  // Bedrock (the native widget already got its local heuristic score).
  if (!token) {
    await saveNotifications([entry, ...existing]);
    return;
  }

  try {
    const [preferences, activeRules] = await Promise.all([getPreferences(), getActiveRuleTexts()]);
    const verdict = await classifyNotification({
      title: data.title,
      body: data.body,
      sourceApp: data.packageName || data.appName,
      preferences,
      activeRules,
      token,
    });
    entry.priority = verdict.label;
    entry.priorityScore = verdict.priorityScore;
    entry.autoRead = verdict.autoRead;
    NativeModules.NotificationModule?.updateWidgetPriority?.(
      entry.title,
      entry.body,
      entry.appName,
      verdict.label,
      data.timestamp
    );
  } catch {
    // Classify call failed (offline, backend hiccup) — still save it
    // unclassified rather than lose it; matches the foreground fallback.
  }

  await saveNotifications([entry, ...existing]);
}
