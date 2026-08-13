import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
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
};

type NotifContextValue = {
  notifications: NotifEntry[];
  clearAll: () => void;
  updatePriority: (id: string, priority: NotifPriority) => void;
  removeNotification: (id: string) => void;
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

// Map backend notification record → NotifEntry
function fromBackend(item: Record<string, unknown>): NotifEntry {
  const labelMap: Record<string, NotifPriority> = {
    critica: 'critica',
    aviso: 'aviso',
    info: 'info',
  };
  return {
    id: (item.notificationId as string) ?? String(Date.now()),
    backendId: item.notificationId as string,
    title: (item.title as string) ?? '',
    body: (item.body as string) ?? '',
    appName: (item.sourceApp as string) ?? '',
    packageName: (item.sourceApp as string) ?? '',
    receivedAt: new Date((item.createdAt as string) ?? Date.now()),
    source: 'system',
    priority: labelMap[(item.priorityLabel as string)] ?? null,
    priorityScore: (item.priorityScore as number) ?? null,
  };
}

const NotifContext = createContext<NotifContextValue>({
  notifications: [],
  clearAll: () => {},
  updatePriority: () => {},
  removeNotification: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotifEntry[]>([]);
  const { token, isAuthReady } = useAuth();
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

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

  // Listen for live notifications
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const addEntry = (entry: NotifEntry) => {
      setNotifications((prev) => [entry, ...prev]);
      // Fire-and-forget to backend
      const t = tokenRef.current;
      if (t) {
        apiCall<{ notificationId: string }>('/notifications', 'POST', {
          title: entry.title,
          body: entry.body,
          sourceApp: entry.packageName || entry.appName,
        }, t).then((data) => {
          if (data?.notificationId) {
            setNotifications((prev) =>
              prev.map((n) => n.id === entry.id ? { ...n, backendId: data.notificationId } : n)
            );
          }
        }).catch(() => {});
      }
    };

    const systemSub = DeviceEventEmitter.addListener(
      'onSystemNotificationReceived',
      (event: { packageName: string; appName: string; title: string; body: string; timestamp: number }) => {
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

    let localSub: any = null;
    import('expo-notifications').then((N) => {
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
    }).catch(() => {});

    return () => {
      systemSub.remove();
      localSub?.remove();
    };
  }, []);

  const clearAll = () => setNotifications([]);

  const updatePriority = (id: string, priority: NotifPriority) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, priority } : n))
    );
    // Post feedback to backend
    const entry = notifications.find((n) => n.id === id);
    const t = tokenRef.current;
    if (entry?.backendId && t) {
      const feedback = priority === 'info' ? 'down' : 'up';
      apiCall(`/notifications/${entry.backendId}/feedback`, 'POST', { feedback }, t).catch(() => {});
    }
  };

  const removeNotification = (id: string) => {
    const entry = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const t = tokenRef.current;
    if (entry?.backendId && t) {
      apiCall(`/notifications/${entry.backendId}`, 'DELETE', undefined, t).catch(() => {});
    }
  };

  return (
    <NotifContext.Provider value={{ notifications, clearAll, updatePriority, removeNotification }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
