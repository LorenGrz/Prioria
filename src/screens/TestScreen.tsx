import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopAppBar from '../components/TopAppBar';
import Icon from '../components/Icon';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

function StatusBadge({ status }: { status: PermissionStatus | null }) {
  if (!status) return null;
  const config = {
    granted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Concedido' },
    denied: { bg: 'bg-error-container', text: 'text-on-error-container', label: 'Denegado' },
    undetermined: { bg: 'bg-surface-container', text: 'text-on-surface-variant', label: 'Sin definir' },
  }[status];
  return (
    <View className={`rounded-full px-sm py-0.5 ${config.bg}`}>
      <Text className={`text-[11px] font-bold ${config.text}`}>{config.label}</Text>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-xl border border-outline-variant bg-surface-container-low p-md space-y-sm">
      {children}
    </View>
  );
}

function ActionButton({
  onPress,
  icon,
  label,
  variant = 'primary',
}: {
  onPress: () => void;
  icon: string;
  label: string;
  variant?: 'primary' | 'outline';
}) {
  const base = 'h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl active:opacity-80';
  const style =
    variant === 'primary'
      ? `${base} bg-primary`
      : `${base} border border-primary bg-transparent`;
  const textStyle = variant === 'primary' ? 'font-label-lg text-on-primary' : 'font-label-lg text-primary';
  const iconColor = variant === 'primary' ? '#ffffff' : '#86a0cd';
  return (
    <Pressable onPress={onPress} className={style}>
      <Icon name={icon as any} size={18} color={iconColor} />
      <Text className={textStyle}>{label}</Text>
    </Pressable>
  );
}

export default function TestScreen() {
  const [pushPermission, setPushPermission] = useState<PermissionStatus | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [lastNotif, setLastNotif] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    const { status } = await Notifications.getPermissionsAsync();
    setPushPermission(status as PermissionStatus);
  }

  async function requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    setPushPermission(status as PermissionStatus);
    if (status === 'granted') {
      await fetchToken();
    }
  }

  async function fetchToken() {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      setPushToken(token.data);
    } catch {
      setPushToken('No disponible (requiere build de producción)');
    }
  }

  async function sendLocalNotification() {
    if (pushPermission !== 'granted') {
      Alert.alert('Permiso requerido', 'Primero concede el permiso de notificaciones.');
      return;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Prioria — Prueba',
        body: 'Notificación de prueba enviada correctamente.',
        data: { test: true },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
    });
    setLastNotif(id);
    Alert.alert('Enviada', 'La notificación aparece en 3 segundos.');
  }

  function openNotificationListenerSettings() {
    Linking.openSettings();
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <TopAppBar />
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="space-y-lg py-lg">

        {/* Push permission */}
        <SectionCard>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-sm">
              <Icon name="bell-ring-outline" size={20} color="#43474e" />
              <Text className="font-label-lg text-on-surface">Permiso de notificaciones</Text>
            </View>
            <StatusBadge status={pushPermission} />
          </View>
          <View className="flex-row gap-sm pt-xs">
            <View className="flex-1">
              <ActionButton
                onPress={requestPermissions}
                icon="bell-plus-outline"
                label="Solicitar permiso"
              />
            </View>
            <View className="flex-1">
              <ActionButton
                onPress={checkPermissions}
                icon="refresh"
                label="Actualizar"
                variant="outline"
              />
            </View>
          </View>
        </SectionCard>

        {/* Local notification */}
        <SectionCard>
          <View className="flex-row items-center gap-sm">
            <Icon name="bell-outline" size={20} color="#43474e" />
            <Text className="font-label-lg text-on-surface">Notificación local de prueba</Text>
          </View>
          <Text className="text-body-sm text-on-surface-variant">
            Dispara una notificación local en 3 segundos para verificar que el sistema de notificaciones funciona.
          </Text>
          <ActionButton
            onPress={sendLocalNotification}
            icon="send-outline"
            label="Enviar en 3 s"
          />
          {lastNotif && (
            <Text className="text-body-sm text-on-surface-variant">
              Última ID: {lastNotif.slice(0, 24)}…
            </Text>
          )}
        </SectionCard>

        {/* Expo push token */}
        <SectionCard>
          <View className="flex-row items-center gap-sm">
            <Icon name="identifier" size={20} color="#43474e" />
            <Text className="font-label-lg text-on-surface">Token Expo Push</Text>
          </View>
          {pushToken ? (
            <View className="rounded-lg bg-surface-container-highest p-sm">
              <Text className="text-body-sm font-mono text-on-surface" selectable>
                {pushToken}
              </Text>
            </View>
          ) : (
            <Text className="text-body-sm text-on-surface-variant">
              Sin token. Solicita el permiso primero.
            </Text>
          )}
          <ActionButton
            onPress={fetchToken}
            icon="key-outline"
            label="Obtener token"
            variant="outline"
          />
        </SectionCard>

        {/* NotificationListenerService */}
        <SectionCard>
          <View className="flex-row items-center gap-sm">
            <Icon name="shield-key-outline" size={20} color="#43474e" />
            <Text className="font-label-lg text-on-surface">Acceso a notificaciones del sistema</Text>
          </View>
          <Text className="text-body-sm text-on-surface-variant">
            Abre los ajustes de Android para habilitar el acceso a las notificaciones de otras apps
            (requerido por NotificationListenerService).
          </Text>
          <ActionButton
            onPress={openNotificationListenerSettings}
            icon="cog-outline"
            label="Abrir ajustes"
            variant="outline"
          />
        </SectionCard>

      </ScrollView>
    </SafeAreaView>
  );
}
