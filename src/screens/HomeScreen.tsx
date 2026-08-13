import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { useNotifications, type NotifPriority } from '../context/NotificationContext';

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

const PRIORITY_STYLE: Record<
  NonNullable<NotifPriority>,
  { label: string; bg: string; text: string }
> = {
  critica: { label: 'Crítica', bg: '#fef2f2', text: '#dc2626' },
  aviso:   { label: 'Aviso',   bg: '#fffbeb', text: '#d97706' },
  info:    { label: 'Info',    bg: '#f0f9ff', text: '#0284c7' },
};

export default function HomeScreen() {
  const { isDark } = useTheme();
  const { notifications } = useNotifications();
  const iconColor = isDark ? '#c8c4d7' : '#43474e';

  const [voicePaused, setVoicePaused] = useState(false);

  const latest = notifications[0] ?? null;
  const critCount = notifications.filter((n) => n.priority === 'critica').length;
  const pendCount = notifications.filter((n) => n.priority === null).length;
  const serviceActive = notifications.length > 0;

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-background dark:bg-train-background">
      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, gap: 12 }}
      >

        {/* Status */}
        <View className="flex-row items-center justify-between rounded-xl border border-outline-variant dark:border-train-outline-variant bg-surface-container-low dark:bg-train-surface-container-low p-md">
          <View className="flex-row items-center gap-sm">
            <View className={`h-3 w-3 rounded-full ${serviceActive ? 'bg-green-500' : 'bg-orange-400'}`} />
            <Text className="font-label-lg text-on-surface dark:text-train-on-surface">
              {serviceActive ? 'Escucha activa' : 'Sin notificaciones aún'}
            </Text>
          </View>
          <Icon name={serviceActive ? 'bell-ring-outline' : 'bell-sleep-outline'} size={20} color={iconColor} />
        </View>

        {/* Voice toggle */}
        <Pressable
          onPress={() => setVoicePaused((v) => !v)}
          className={`h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl shadow-sm active:opacity-90 ${voicePaused ? 'bg-error' : 'bg-primary dark:bg-train-primary-container'}`}
        >
          <Icon name={voicePaused ? 'play-circle-outline' : 'microphone-off'} size={20} color="#ffffff" />
          <Text className="font-label-lg text-on-primary dark:text-train-on-primary-container">
            {voicePaused ? 'Reanudar Lectura de Voz' : 'Pausar Lectura de Voz'}
          </Text>
        </Pressable>

        {/* Last notification */}
        <View>
          <Text className="mb-xs px-1 font-label-lg text-on-surface-variant dark:text-train-on-surface-variant">
            Última Notificación
          </Text>
          {latest ? (
            <View className="rounded-xl border border-outline-variant dark:border-train-outline-variant bg-surface-container-low dark:bg-train-surface-container p-md gap-xs">
              <View className="flex-row items-start justify-between gap-sm">
                <View className="flex-1">
                  <Text className="font-label-lg text-on-surface dark:text-train-on-surface" numberOfLines={1}>
                    {latest.title}
                  </Text>
                  <Text className="font-body-md text-on-surface-variant dark:text-train-on-surface-variant" numberOfLines={2}>
                    {latest.body}
                  </Text>
                </View>
                {latest.priority && (
                  <View style={{ backgroundColor: PRIORITY_STYLE[latest.priority].bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                    <Text style={{ color: PRIORITY_STYLE[latest.priority].text, fontSize: 11, fontWeight: '600' }}>
                      {PRIORITY_STYLE[latest.priority].label}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center gap-xs">
                <Text className="text-[11px] text-on-surface-variant dark:text-train-on-surface-variant">
                  {latest.appName}
                </Text>
                <Text className="text-[11px] text-on-surface-variant dark:text-train-on-surface-variant">·</Text>
                <Text className="text-[11px] text-on-surface-variant dark:text-train-on-surface-variant">
                  {timeAgo(latest.receivedAt)}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center gap-md rounded-xl border border-dashed border-outline-variant dark:border-train-outline-variant bg-surface-container-lowest dark:bg-train-surface-container px-md py-lg">
              <Icon name="bell-off-outline" size={28} color={iconColor} />
              <View className="flex-1">
                <Text className="font-label-lg text-on-surface-variant dark:text-train-on-surface-variant">
                  Sin notificaciones aún
                </Text>
                <Text className="text-body-sm text-on-surface-variant dark:text-train-on-surface-variant opacity-70">
                  Ajustes → Acceso a notificaciones del sistema
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Daily summary */}
        <View>
          <Text className="mb-xs px-1 font-label-lg text-on-surface-variant dark:text-train-on-surface-variant">
            Resumen del Día
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            <View className="w-full flex-row items-center justify-between rounded-xl border border-outline-variant dark:border-train-outline-variant bg-surface-container dark:bg-train-surface-container p-md">
              <View>
                <Text className="font-label-md text-on-surface-variant dark:text-train-on-surface-variant">Total recibidas</Text>
                <Text className="font-display text-display text-on-surface dark:text-train-on-surface">
                  {notifications.length}
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high dark:bg-train-surface-container-high">
                <Icon name="bell-outline" size={20} color={iconColor} />
              </View>
            </View>
            <View className="flex-1 rounded-xl bg-primary-container dark:bg-train-primary-container p-md">
              <Icon name="alert-circle-outline" size={20} color="#86a0cd" />
              <Text className="mt-sm text-label-md text-on-primary-container dark:text-train-on-primary-container opacity-80">Críticas</Text>
              <Text className="font-headline-lg text-on-primary-container dark:text-train-on-primary-container">
                {critCount}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-surface-container-highest dark:bg-train-surface-container-highest p-md">
              <Icon name="clock-outline" size={20} color={iconColor} />
              <Text className="mt-sm text-label-md text-on-surface-variant dark:text-train-on-surface-variant">Sin clasificar</Text>
              <Text className="font-headline-lg text-on-surface dark:text-train-on-surface">
                {pendCount}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
