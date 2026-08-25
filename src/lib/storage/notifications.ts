import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotifPriority = 'critica' | 'aviso' | 'info' | null;

export type NotifEntry = {
  id: string;
  title: string;
  body: string;
  appName: string;
  packageName: string;
  receivedAt: Date;
  source: 'local' | 'system';
  priority: NotifPriority;
  priorityScore: number | null;
  autoRead?: boolean;
};

type StoredNotifEntry = Omit<NotifEntry, 'receivedAt'> & { receivedAt: string };

const STORAGE_KEY = 'prioria_notifications';
// No more weekly server-side archive job now that this lives on-device —
// prune anything older than this on every write instead.
const RETENTION_DAYS = 60;

function pruneExpired(entries: NotifEntry[]): NotifEntry[] {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return entries.filter((n) => n.receivedAt.getTime() >= cutoff);
}

export async function getAllNotifications(): Promise<NotifEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredNotifEntry[];
    const entries = parsed.map((n) => ({ ...n, receivedAt: new Date(n.receivedAt) }));
    return pruneExpired(entries).sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  } catch {
    return [];
  }
}

export async function saveNotifications(entries: NotifEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pruneExpired(entries)));
}
