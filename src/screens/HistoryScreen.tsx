import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopAppBar from '../components/TopAppBar';
import Icon from '../components/Icon';
import { useTheme } from '../context/ThemeContext';

const FILTERS = ['Todas', 'Urgentes', 'Leídas', 'Ignoradas'];

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const { isDark } = useTheme();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-train-background">
      <TopAppBar />
      <View className="px-margin-mobile pt-md">
        <Text className="mb-xs font-headline-lg-mobile text-primary dark:text-train-primary">
          Historial de Alertas
        </Text>
        <Text className="mb-md font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
          Resumen de notificaciones procesadas hoy.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-xs pb-md">
          {FILTERS.map((f) => {
            const active = f === activeFilter;
            return (
              <Pressable
                key={f}
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
          })}
        </ScrollView>
      </View>

      {/* Empty state */}
      <View className="flex-1 items-center justify-center px-margin-mobile">
        <Icon name="bell-sleep-outline" size={48} color={isDark ? '#928ea0' : '#74777f'} />
        <Text className="mt-md text-center font-headline-lg-mobile text-on-surface-variant dark:text-train-on-surface-variant">
          Sin historial todavía
        </Text>
        <Text className="mt-xs text-center font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
          Las notificaciones procesadas aparecerán aquí cuando el servicio esté activo.
        </Text>
      </View>
    </SafeAreaView>
  );
}
