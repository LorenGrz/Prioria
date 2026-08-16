import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopAppBar from '../components/TopAppBar';
import Icon from '../components/Icon';

type PermStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

function StatusBadge({ status }: { status: PermStatus | null }) {
  if (!status) return null;
  const config: Record<PermStatus, { bg: string; text: string; label: string }> = {
    granted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Concedido' },
    denied: { bg: 'bg-error-container', text: 'text-on-error-container', label: 'Denegado' },
    undetermined: { bg: 'bg-surface-container', text: 'text-on-surface-variant', label: 'Sin definir' },
    unavailable: { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant', label: 'No disponible' },
  };
  const c = config[status];
  return (
    <View className={`rounded-full px-sm py-0.5 ${c.bg}`}>
      <Text className={`text-[11px] font-bold ${c.text}`}>{c.label}</Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-xl border border-outline-variant bg-surface-container-low p-md space-y-sm">
      {children}
    </View>
  );
}

function Btn({
  onPress, icon, label, variant = 'primary',
}: { onPress: () => void; icon: string; label: string; variant?: 'primary' | 'outline' }) {
  const base = 'h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl active:opacity-80';
  return (
    <Pressable
      onPress={onPress}
      className={variant === 'primary' ? `${base} bg-primary` : `${base} border border-primary`}
    >
      <Icon name={icon as any} size={18} color={variant === 'primary' ? '#ffffff' : '#86a0cd'} />
      <Text className={variant === 'primary' ? 'font-label-lg text-on-primary' : 'font-label-lg text-primary'}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TestScreen() {
  const [permStatus, setPermStatus] = useState<PermStatus | null>(null);
  const [lastNotifId, setLastNotifId] = useState<string | null>(null);
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);

  async function checkPermission() {
    try {
      const Notif = await import('expo-notifications');
      const { status } = await Notif.getPermissionsAsync();
      setPermStatus(status as PermStatus);
    } catch {
      setPermStatus('unavailable');
    }
  }

  async function requestPermission() {
    try {
      const Notif = await import('expo-notifications');
      const { status } = await Notif.requestPermissionsAsync();
      setPermStatus(status as PermStatus);
    } catch {
      setPermStatus('unavailable');
      Alert.alert('No disponible', 'Los permisos de notificación no están disponibles en Expo Go. Usá el APK descargado desde EAS.');
    }
  }

  async function sendLocal() {
    try {
      const Notif = await import('expo-notifications');
      Notif.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      const id = await Notif.scheduleNotificationAsync({
        content: {
          title: 'Prioria — Prueba',
          body: 'Notificación de prueba enviada correctamente.',
        },
        trigger: { type: Notif.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
      });
      setLastNotifId(id.slice(0, 20) + '…');
      Alert.alert('Enviada', 'Aparece en 3 segundos.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No disponible en Expo Go. Usá el APK de EAS.');
    }
  }

  async function fetchToken() {
    try {
      const Notif = await import('expo-notifications');
      const { data } = await Notif.getExpoPushTokenAsync();
      setTokenMsg(data);
    } catch {
      setTokenMsg('Requiere development build — no disponible en Expo Go.');
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <TopAppBar />
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="space-y-lg py-lg">

        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-sm">
              <Icon name="bell-ring-outline" size={20} color="#43474e" />
              <Text className="font-label-lg text-on-surface">Permiso de notificaciones</Text>
            </View>
            <StatusBadge status={permStatus} />
          </View>
          <View className="flex-row gap-sm pt-xs">
            <View className="flex-1">
              <Btn onPress={requestPermission} icon="bell-plus-outline" label="Solicitar" />
            </View>
            <View className="flex-1">
              <Btn onPress={checkPermission} icon="refresh" label="Verificar" variant="outline" />
            </View>
          </View>
        </Card>

        <Card>
          <View className="flex-row items-center gap-sm">
            <Icon name="bell-outline" size={20} color="#43474e" />
            <Text className="font-label-lg text-on-surface">Notificación local de prueba</Text>
          </View>
          <Text className="text-body-sm text-on-surface-variant">
            Dispara una notificación local en 3 segundos.
          </Text>
          <Btn onPress={sendLocal} icon="send-outline" label="Enviar en 3 s" />
          {lastNotifId && (
            <Text className="text-body-sm text-on-surface-variant">ID: {lastNotifId}</Text>
          )}
        </Card>

        <Card>
          <View className="flex-row items-center gap-sm">
            <Icon name="identifier" size={20} color="#43474e" />
            <Text className="font-label-lg text-on-surface">Token Expo Push</Text>
          </View>
          {tokenMsg ? (
            <View className="rounded-lg bg-surface-container-highest p-sm">
              <Text className="text-body-sm text-on-surface" selectable>{tokenMsg}</Text>
            </View>
          ) : (
            <Text className="text-body-sm text-on-surface-variant">Sin token.</Text>
          )}
          <Btn onPress={fetchToken} icon="key-outline" label="Obtener token" variant="outline" />
        </Card>

        <Card>
          <View className="flex-row items-center gap-sm">
            <Icon name="shield-key-outline" size={20} color="#43474e" />
            <Text className="font-label-lg text-on-surface">Acceso a notificaciones del sistema</Text>
          </View>
          <Text className="text-body-sm text-on-surface-variant">
            Abre los ajustes de Android para habilitar NotificationListenerService.
          </Text>
          <Btn onPress={Linking.openSettings} icon="cog-outline" label="Abrir ajustes" variant="outline" />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}
