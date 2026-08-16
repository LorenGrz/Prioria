import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { useNotifications, type NotifEntry, type NotifPriority } from '../context/NotificationContext';

const FILTERS = ['Todas', 'Críticas', 'Locales'];

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

type PriorityChip = { key: NonNullable<NotifPriority>; label: string; color: string; bg: string; border: string };

const PRIORITY_CHIPS: PriorityChip[] = [
  { key: 'critica', label: 'Urgente', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  { key: 'aviso',   label: 'Normal',  color: '#0284c7', bg: '#f0f9ff', border: '#7dd3fc' },
  { key: 'info',    label: 'Info',    color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
];

function NotifCard({ item }: { item: NotifEntry }) {
  const { updatePriority, removeNotification, boostPriority } = useNotifications();
  const { isDark } = useTheme();
  const iconColor = isDark ? '#928ea0' : '#74777f';
  const cardBg = isDark ? '#1a2123' : '#ffffff';

  return (
    <Pressable
      onPress={() => boostPriority(item.id)}
      className="rounded-xl border border-outline-variant dark:border-train-outline-variant p-md active:opacity-80"
      style={{ backgroundColor: cardBg }}
    >
      {/* Header row */}
      <View className="mb-xs flex-row items-start justify-between gap-sm">
        <View className="flex-row items-center gap-xs flex-1">
          <Icon name="bell-outline" size={16} color={iconColor} />
          <Text className="flex-1 font-label-lg text-on-surface dark:text-train-on-surface" numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View className="flex-row items-center gap-sm">
          <Text className="text-label-md text-on-surface-variant dark:text-train-on-surface-variant">
            {timeAgo(item.receivedAt)}
          </Text>
          <Pressable onPress={() => removeNotification(item.id)} hitSlop={8}>
            <Icon name="trash-can-outline" size={16} color={iconColor} />
          </Pressable>
        </View>
      </View>

      {/* Body */}
      {item.body ? (
        <Text className="mb-sm text-body-sm text-on-surface-variant dark:text-train-on-surface-variant">
          {item.body}
        </Text>
      ) : null}

      {/* Source + priority chips */}
      <View className="flex-row flex-wrap items-center gap-xs">
        <View className="rounded-full bg-surface-container dark:bg-train-surface-container px-sm py-0.5">
          <Text className="text-[10px] font-bold text-on-surface-variant dark:text-train-on-surface-variant">
            {item.source === 'local' ? 'Local' : 'Sistema'}
          </Text>
        </View>
        {item.appName && item.appName !== 'Prioria' && (
          <Text className="text-[10px] text-on-surface-variant dark:text-train-on-surface-variant">
            {item.appName}
          </Text>
        )}

        <View style={{ flex: 1 }} />

        {PRIORITY_CHIPS.map((chip) => {
          const active = item.priority === chip.key;
          return (
            <Pressable
              key={chip.key}
              onPress={() => updatePriority(item.id, chip.key)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? chip.border : (isDark ? '#474554' : '#c4c6cf'),
                backgroundColor: active ? chip.bg : 'transparent',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: active ? chip.color : (isDark ? '#928ea0' : '#74777f') }}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const { isDark } = useTheme();
  const { notifications, clearAll } = useNotifications();
  const iconColor = isDark ? '#928ea0' : '#74777f';

  const filtered = activeFilter === 'Críticas'
    ? notifications.filter((n) => n.priority === 'critica')
    : activeFilter === 'Locales'
    ? notifications.filter((n) => n.source === 'local')
    : notifications;

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-background dark:bg-train-background">
      <View className="px-margin-mobile pt-md">
        <View className="mb-xs flex-row items-center justify-between">
          <Text className="font-headline-lg-mobile text-primary dark:text-train-primary">
            Historial de Alertas
          </Text>
          {notifications.length > 0 && (
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text className="text-label-md text-on-surface-variant dark:text-train-on-surface-variant">
                Limpiar todo
              </Text>
            </Pressable>
          )}
        </View>
        <Text className="mb-md font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
          Notificaciones procesadas hoy.
        </Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
          data={FILTERS}
          keyExtractor={(f) => f}
          renderItem={({ item: f }) => {
            const active = f === activeFilter;
            return (
              <Pressable
                onPress={() => setActiveFilter(f)}
                className={`h-touch-target-min items-center justify-center rounded-full px-md ${
                  active
                    ? 'bg-primary dark:bg-train-primary-container'
                    : 'border border-outline-variant dark:border-train-outline-variant bg-surface-container-low dark:bg-train-surface-container-low'
                }`}
              >
                <Text className={`font-label-lg ${
                  active
                    ? 'text-on-primary dark:text-train-on-primary-container'
                    : 'text-on-surface dark:text-train-on-surface'
                }`}>
                  {f}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-margin-mobile">
          <Icon name="bell-sleep-outline" size={48} color={iconColor} />
          <Text className="mt-md text-center font-headline-lg-mobile text-on-surface-variant dark:text-train-on-surface-variant">
            {activeFilter === 'Todas' ? 'Sin historial todavía' : `No hay notificaciones en "${activeFilter}"`}
          </Text>
          <Text className="mt-xs text-center font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
            Las notificaciones recibidas aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => <NotifCard item={item} />}
        />
      )}
    </SafeAreaView>
  );
}
