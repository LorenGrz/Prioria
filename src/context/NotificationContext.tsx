import { createContext, useContext, useEffect, useState } from 'react';
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

export type NotifEntry = {
  id: string;
  title: string;
  body: string;
  appName: string;
  packageName: string;
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

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Listen for system notifications from the native NotificationListenerService
    const systemSub = DeviceEventEmitter.addListener(
      'onSystemNotificationReceived',
      (event: { packageName: string; appName: string; title: string; body: string; timestamp: number }) => {
        setNotifications((prev) => [
          {
            id: `${event.packageName}-${event.timestamp}`,
            title: event.title,
            body: event.body,
            appName: event.appName,
            packageName: event.packageName,
            receivedAt: new Date(event.timestamp),
            source: 'system',
          },
          ...prev,
        ]);
      }
    );

    // Also listen for Prioria's own local notifications (expo-notifications)
    let localSub: any = null;
    import('expo-notifications').then((N) => {
      localSub = N.addNotificationReceivedListener((notification) => {
        const { title, body } = notification.request.content;
        setNotifications((prev) => [
          {
            id: notification.request.identifier,
            title: title ?? 'Sin título',
            body: body ?? '',
            appName: 'Prioria',
            packageName: 'com.lorengrz.prioria',
            receivedAt: new Date(),
            source: 'local',
          },
          ...prev,
        ]);
      });
    }).catch(() => {});

    return () => {
      systemSub.remove();
      localSub?.remove();
    };
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
