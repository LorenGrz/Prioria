import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { useAuth } from './AuthContext';
import { apiCall } from '../services/api';

export type NotifPriority = 'critica' | 'aviso' | 'info' | null;

export type NotifEntry = {
  id: string;
  backendId?: string;
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

type NotifContextValue = {
  notifications: NotifEntry[];
  clearAll: () => void;
  updatePriority: (id: string, priority: NotifPriority) => void;
  removeNotification: (id: string) => void;
  markOpened: (id: string) => void;
  boostPriority: (id: string) => void;
};

const CRITICA_KEYWORDS = [
  'banco', 'transferencia', 'pago', 'saldo', 'crédito', 'credito',
  'débito', 'debito', 'alerta', 'contraseña', 'contrasena', 'código',
  'codigo', 'verificación', 'verificacion', 'urgente', 'factura',
  'fraude', 'bloqueado', 'seguridad',
];

const AVISO_KEYWORDS = [
  'cliente', 'reunión', 'reunion', 'tarea', 'entrega', 'pedido',
  'trabajo', 'plazo', 'mensaje', 'llamada', 'recordatorio',
];

function scoreLocally(title: string, body: string): NotifPriority {
  const text = `${title} ${body}`.toLowerCase();
  if (CRITICA_KEYWORDS.some((kw) => text.includes(kw))) return 'critica';
  if (AVISO_KEYWORDS.some((kw) => text.includes(kw))) return 'aviso';
  return 'info';
}

const LABEL_MAP: Record<string, NotifPriority> = {
  critica: 'critica',
  aviso: 'aviso',
  info: 'info',
};

function fromBackend(item: Record<string, unknown>): NotifEntry {
  return {
    id: (item.notificationId as string) ?? String(Date.now()),
    backendId: item.notificationId as string,
    title: (item.title as string) ?? '',
    body: (item.body as string) ?? '',
    appName: (item.sourceApp as string) ?? '',
    packageName: (item.sourceApp as string) ?? '',
    receivedAt: new Date((item.createdAt as string) ?? Date.now()),
    source: 'system',
    priority: LABEL_MAP[(item.priorityLabel as string)] ?? null,
    priorityScore: (item.priorityScore as number) ?? null,
    autoRead: Boolean(item.autoRead),
  };
}

const NotifContext = createContext<NotifContextValue>({
  notifications: [],
  clearAll: () => {},
  updatePriority: () => {},
  removeNotification: () => {},
  markOpened: () => {},
  boostPriority: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotifEntry[]>([]);
  const { token, isAuthReady } = useAuth();

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Stable ref to current notifications — avoids stale closures in callbacks
  const notificationsRef = useRef<NotifEntry[]>([]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  // Ref to boostByBackendId — updated each render so the widget listener is never stale
  const boostByBackendIdRef = useRef<(backendId: string) => void>(() => {});

  // TTS: fires when the agent upgrades a notification to critica + autoRead
  const prevPriorityRef = useRef<Map<string, NotifPriority>>(new Map());
  useEffect(() => {
    for (const n of notifications) {
      const prev = prevPriorityRef.current.get(n.id);
      if (prev !== undefined && prev !== 'critica' && n.priority === 'critica' && n.autoRead) {
        Speech.speak(`${n.title}. ${n.body}`, { language: 'es-ES', rate: 1.0 });
      }
    }
    prevPriorityRef.current = new Map(notifications.map((n) => [n.id, n.priority]));
  }, [notifications]);

  // Load history from backend on startup
  useEffect(() => {
    if (!isAuthReady || !token) return;
    apiCall<{ items: Record<string, unknown>[] }>('/notifications', 'GET', undefined, token)
      .then((data) => {
        if (Array.isArray(data?.items)) {
          setNotifications(data.items.map(fromBackend));
        }
      })
      .catch((err) => console.warn('[NotifContext] GET /notifications failed:', err));
  }, [isAuthReady, token]);

  // Merge agent verdicts from backend into local state + push update to widget
  const refreshFromBackend = () => {
    const t = tokenRef.current;
    if (!t) return;
    apiCall<{ items: Record<string, unknown>[] }>('/notifications', 'GET', undefined, t)
      .then((data) => {
        if (!Array.isArray(data?.items)) return;
        const byBackendId = new Map(
          data.items.map((item) => [item.notificationId as string, item])
        );

        // Compute what changed using the current ref (avoids impure state updater)
        const current = notificationsRef.current;
        const updates = new Map<string, Partial<NotifEntry>>();

        for (const n of current) {
          if (!n.backendId) continue;
          const remote = byBackendId.get(n.backendId);
          if (!remote || remote.priorityScore == null) continue;
          const newPriority = LABEL_MAP[remote.priorityLabel as string] ?? n.priority;
          const newScore = Number(remote.priorityScore);
          if (newPriority !== n.priority || newScore !== n.priorityScore) {
            updates.set(n.id, {
              priority: newPriority,
              priorityScore: newScore,
              autoRead: Boolean(remote.autoRead),
            });
          }
        }

        if (updates.size === 0) return;

        setNotifications((prev) =>
          prev.map((n) => {
            const patch = updates.get(n.id);
            return patch ? { ...n, ...patch } : n;
          })
        );

        // Update the home-screen widget with the most recently updated notification
        if (Platform.OS === 'android') {
          const updatedEntries = current.filter((n) => updates.has(n.id));
          if (updatedEntries.length === 0) return;
          const latest = updatedEntries.reduce((a, b) =>
            a.receivedAt > b.receivedAt ? a : b
          );
          const patch = updates.get(latest.id)!;
          NativeModules.NotificationModule?.updateWidgetPriority?.(
            latest.title,
            latest.body,
            latest.appName,
            patch.priority ?? 'info',
            latest.receivedAt.getTime(),
          );
        }
      })
      .catch(() => {});
  };

  // Live notification listeners (system + local expo push) + widget boost listener
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const addEntry = (entry: NotifEntry) => {
      setNotifications((prev) => [entry, ...prev]);
      const t = tokenRef.current;
      if (!t) return;
      apiCall<{ notificationId: string }>('/notifications', 'POST', {
        title: entry.title,
        body: entry.body,
        sourceApp: entry.packageName || entry.appName,
      }, t)
        .then((data) => {
          if (!data?.notificationId) return;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === entry.id ? { ...n, backendId: data.notificationId } : n
            )
          );
          // Store backendId in native SharedPreferences for widget tap → boost
          NativeModules.NotificationModule?.setLastBackendId?.(data.notificationId);
          // Pick up agent verdict after async SQS processing
          setTimeout(refreshFromBackend, 8000);
        })
        .catch(() => {});
    };

    const systemSub = DeviceEventEmitter.addListener(
      'onSystemNotificationReceived',
      (event: {
        packageName: string;
        appName: string;
        title: string;
        body: string;
        timestamp: number;
      }) => {
        addEntry({
          id: `${event.packageName}-${event.timestamp}`,
          title: event.title,
          body: event.body,
          appName: event.appName,
          packageName: event.packageName,
          receivedAt: new Date(event.timestamp),
          source: 'system',
          priority: scoreLocally(event.title, event.body),
          priorityScore: null,
        });
      }
    );

    // Widget tap → boost: uses ref so it always calls the latest boostByBackendId
    const widgetBoostSub = DeviceEventEmitter.addListener(
      'onWidgetTapBoost',
      (event: { notificationId: string }) => {
        boostByBackendIdRef.current(event.notificationId);
      }
    );

    let localSub: ReturnType<
      Awaited<typeof import('expo-notifications')>['addNotificationReceivedListener']
    > | null = null;
    import('expo-notifications')
      .then((N) => {
        localSub = N.addNotificationReceivedListener((notification) => {
          const { title, body } = notification.request.content;
          const t = title ?? 'Sin título';
          const b = body ?? '';
          addEntry({
            id: notification.request.identifier,
            title: t,
            body: b,
            appName: 'Prioria',
            packageName: 'com.lorengrz.prioria',
            receivedAt: new Date(),
            source: 'local',
            priority: scoreLocally(t, b),
            priorityScore: null,
          });
        });
      })
      .catch(() => {});

    return () => {
      systemSub.remove();
      widgetBoostSub.remove();
      localSub?.remove();
    };
  }, []);

  const clearAll = () => setNotifications([]);

  const updatePriority = (id: string, priority: NotifPriority) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, priority } : n))
    );
    const entry = notificationsRef.current.find((n) => n.id === id);
    const t = tokenRef.current;
    if (!entry?.backendId || !t) return;
    const feedback = priority === 'info' ? 'down' : 'up';
    apiCall<Record<string, unknown>>(
      `/notifications/${entry.backendId}/feedback`,
      'POST',
      { feedback },
      t
    )
      .then((attrs) => {
        if (attrs?.priorityScore == null) return;
        const newScore = Number(attrs.priorityScore);
        const newPriority = LABEL_MAP[attrs.priorityLabel as string] ?? priority;
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, priorityScore: newScore, priority: newPriority } : n
          )
        );
      })
      .catch(() => {});
  };

  const removeNotification = (id: string) => {
    const entry = notificationsRef.current.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const t = tokenRef.current;
    if (entry?.backendId && t) {
      apiCall(`/notifications/${entry.backendId}`, 'DELETE', undefined, t).catch(() => {});
    }
  };

  // Weak signal: records that the user opened/read the notification
  const markOpened = (id: string) => {
    const entry = notificationsRef.current.find((n) => n.id === id);
    const t = tokenRef.current;
    if (entry?.backendId && t) {
      apiCall(`/notifications/${entry.backendId}/open`, 'POST', undefined, t).catch(() => {});
    }
  };

  // Medium signal: explicit user interaction → bumps priorityScore in DB
  const boostPriority = (id: string) => {
    const entry = notificationsRef.current.find((n) => n.id === id);
    const t = tokenRef.current;
    if (!entry?.backendId || !t) return;
    apiCall<Record<string, unknown>>(
      `/notifications/${entry.backendId}/boost`,
      'POST',
      undefined,
      t
    )
      .then((attrs) => {
        if (attrs?.priorityScore == null) return;
        const newScore = Number(attrs.priorityScore);
        const newPriority = LABEL_MAP[attrs.priorityLabel as string] ?? entry.priority;
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, priorityScore: newScore, priority: newPriority } : n
          )
        );
      })
      .catch(() => {});
  };

  // Widget tapped: find by backendId and boost; fallback to direct API if not in local list
  const boostByBackendId = (backendId: string) => {
    const n = notificationsRef.current.find((n) => n.backendId === backendId);
    if (n) {
      boostPriority(n.id);
    } else {
      const t = tokenRef.current;
      if (t) {
        apiCall(`/notifications/${backendId}/boost`, 'POST', undefined, t).catch(() => {});
      }
    }
  };

  // Keep ref current so the widget boost listener (captured at mount) always has the latest impl
  boostByBackendIdRef.current = boostByBackendId;

  return (
    <NotifContext.Provider
      value={{ notifications, clearAll, updatePriority, removeNotification, markOpened, boostPriority }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
