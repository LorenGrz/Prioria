import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { useAuth } from './AuthContext';
import { usePreferences } from './PreferencesContext';
import { useRules } from './RulesContext';
import { classifyNotification } from '../services/classify';
import {
  getAllNotifications,
  saveNotifications,
  type NotifEntry,
  type NotifPriority,
} from '../lib/storage/notifications';
import { clampScore, labelForScore } from '../lib/scoring';
import type { Preferences } from '../lib/storage/preferences';

export type { NotifEntry, NotifPriority };

type NotifContextValue = {
  notifications: NotifEntry[];
  clearAll: () => void;
  updatePriority: (id: string, priority: NotifPriority) => void;
  removeNotification: (id: string) => void;
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

const BAND_SCORE: Record<Exclude<NotifPriority, null>, number> = { critica: 90, aviso: 60, info: 20 };

const NotifContext = createContext<NotifContextValue>({
  notifications: [],
  clearAll: () => {},
  updatePriority: () => {},
  removeNotification: () => {},
  boostPriority: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotifEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { token } = useAuth();
  const { preferences } = usePreferences();
  const { activeRuleTexts } = useRules();

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const preferencesRef = useRef<Preferences>(preferences);
  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);

  // Stable ref to current notifications — avoids stale closures in callbacks
  const notificationsRef = useRef<NotifEntry[]>([]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  // Ref to boostByLocalId — updated each render so the widget listener is never stale
  const boostByLocalIdRef = useRef<(localId: string) => void>(() => {});

  // Load persisted history on mount (local-only now — no more GET /notifications)
  useEffect(() => {
    getAllNotifications().then((entries) => {
      setNotifications(entries);
      setLoaded(true);
    });
  }, []);

  // Persist on every change, once the initial load has completed (otherwise
  // the empty initial state would overwrite storage before it's read).
  useEffect(() => {
    if (!loaded) return;
    saveNotifications(notifications).catch(() => {});
  }, [notifications, loaded]);

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

  // Live notification listeners (system + local expo push) + widget boost listener
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const addEntry = (entry: NotifEntry) => {
      setNotifications((prev) => [entry, ...prev]);
      const t = tokenRef.current;
      if (!t) return;

      classifyNotification({
        title: entry.title,
        body: entry.body,
        sourceApp: entry.packageName || entry.appName,
        preferences: preferencesRef.current,
        activeRules: activeRuleTexts(),
        token: t,
      })
        .then((verdict) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === entry.id
                ? { ...n, priority: verdict.label, priorityScore: verdict.priorityScore, autoRead: verdict.autoRead }
                : n
            )
          );
          // Store the local id in native SharedPreferences for widget tap → boost
          NativeModules.NotificationModule?.setLastBackendId?.(entry.id);
          NativeModules.NotificationModule?.updateWidgetPriority?.(
            entry.title, entry.body, entry.appName, verdict.label, entry.receivedAt.getTime(),
          );
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

    // Widget tap → boost: uses ref so it always calls the latest boostByLocalId
    const widgetBoostSub = DeviceEventEmitter.addListener(
      'onWidgetTapBoost',
      (event: { notificationId: string }) => {
        boostByLocalIdRef.current(event.notificationId);
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

  // Strong reinforcement signal from Historial's chips — sets score directly
  // to the picked band's representative value (mirrors the old feedback.js).
  const updatePriority = (id: string, priority: NotifPriority) => {
    if (!priority) return;
    const score = BAND_SCORE[priority];
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, priority, priorityScore: score } : n))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Medium signal: widget tap or Historial card tap — nudges score up (mirrors the old boost.js).
  const BOOST_AMOUNT = 8;
  const boostPriority = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const nextScore = clampScore((n.priorityScore ?? 50) + BOOST_AMOUNT);
        return { ...n, priorityScore: nextScore, priority: labelForScore(nextScore) };
      })
    );
  };

  // Keep ref current so the widget boost listener (captured at mount) always has the latest impl
  boostByLocalIdRef.current = boostPriority;

  return (
    <NotifContext.Provider
      value={{ notifications, clearAll, updatePriority, removeNotification, boostPriority }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
