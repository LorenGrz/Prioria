import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type NotifEntry = {
  id: string;
  title: string;
  body: string;
  receivedAt: Date;
  source: 'local' | 'system';
};

type NotifContextValue = {
  notifications: NotifEntry[];
  clearAll: () => void;
};

const NotifContext = createContext<NotifContextValue>({ notifications: [], clearAll: () => {} });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotifEntry[]>([]);
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let cleanup: (() => void) | null = null;

    import('expo-notifications').then((N) => {
      // Listen for notifications received while app is in foreground or background
      const sub = N.addNotificationReceivedListener((notification) => {
        const { title, body } = notification.request.content;
        setNotifications((prev) => [
          {
            id: notification.request.identifier,
            title: title ?? 'Sin título',
            body: body ?? '',
            receivedAt: new Date(),
            source: 'local',
          },
          ...prev,
        ]);
      });
      listenerRef.current = sub;
      cleanup = () => sub.remove();
    }).catch(() => {});

    return () => { cleanup?.(); };
  }, []);

  const clearAll = () => setNotifications([]);

  return (
    <NotifContext.Provider value={{ notifications, clearAll }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
