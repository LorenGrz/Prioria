import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

const FILTERS = ['Todas', 'Locales'];

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const { isDark } = useTheme();
  const { notifications, clearAll } = useNotifications();
  const iconColor = isDark ? '#928ea0' : '#74777f';
  const cardBg = isDark ? '#1a2123' : '#ffffff';

  const filtered = notifications; // expandir cuando haya más fuentes

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-background dark:bg-train-background">
      <View className="px-margin-mobile pt-md">
        <View className="mb-xs flex-row items-center justify-between">
          <Text className="font-headline-lg-mobile text-primary dark:text-train-primary">
            Historial de Alertas
          </Text>
          {notifications.length > 0 && (
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text className="text-label-md text-on-surface-variant dark:text-train-on-surface-variant">Limpiar</Text>
            </Pressable>
          )}
        </View>
        <Text className="mb-md font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
          Resumen de notificaciones procesadas hoy.
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
            Sin historial todavía
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
          renderItem={({ item }) => (
            <View
              className="rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
              style={{ backgroundColor: cardBg }}
            >
              <View className="mb-xs flex-row items-start justify-between gap-sm">
                <View className="flex-row items-center gap-xs flex-1">
                  <Icon name="bell-outline" size={16} color={iconColor} />
                  <Text
                    className="flex-1 font-label-lg text-on-surface dark:text-train-on-surface"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </View>
                <Text className="text-label-md text-on-surface-variant dark:text-train-on-surface-variant">
                  {timeAgo(item.receivedAt)}
                </Text>
              </View>
              {item.body ? (
                <Text className="text-body-sm text-on-surface-variant dark:text-train-on-surface-variant">
                  {item.body}
                </Text>
              ) : null}
              <View className="mt-xs flex-row items-center gap-xs">
                <View className="rounded-full bg-primary-container dark:bg-train-primary-container px-sm py-0.5">
                  <Text className="text-[10px] font-bold text-on-primary-container dark:text-train-on-primary-container">
                    {item.source === 'local' ? 'Local' : 'Sistema'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
