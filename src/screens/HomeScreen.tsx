import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopAppBar from '../components/TopAppBar';
import Icon from '../components/Icon';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const [voicePaused, setVoicePaused] = useState(false);
  const { isDark } = useTheme();
  const iconColor = isDark ? '#c8c4d7' : '#43474e';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-train-background">
      <TopAppBar />
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="space-y-lg py-lg">

        {/* Status */}
        <View className="flex-row items-center justify-between rounded-xl border border-outline-variant dark:border-train-outline-variant bg-surface-container-low dark:bg-train-surface-container-low p-md">
          <View className="flex-row items-center gap-sm">
            <View className="h-3 w-3 rounded-full bg-orange-400" />
            <Text className="font-label-lg text-on-surface dark:text-train-on-surface">
              Servicio de escucha inactivo
            </Text>
          </View>
          <Icon name="bell-sleep-outline" size={20} color={iconColor} />
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

        {/* Last notification — empty state */}
        <View>
          <Text className="mb-sm px-1 font-label-lg text-on-surface-variant dark:text-train-on-surface-variant">
            Última Notificación
          </Text>
          <View className="items-center justify-center rounded-xl border border-dashed border-outline-variant dark:border-train-outline-variant bg-surface-container-lowest dark:bg-train-surface-container p-xl">
            <Icon name="bell-off-outline" size={32} color={iconColor} />
            <Text className="mt-sm text-center font-label-lg text-on-surface-variant dark:text-train-on-surface-variant">
              Sin notificaciones aún
            </Text>
            <Text className="mt-xs text-center text-body-sm text-on-surface-variant dark:text-train-on-surface-variant">
              Habilitá el acceso en Ajustes → Acceso a notificaciones del sistema
            </Text>
          </View>
        </View>

        {/* Daily summary */}
        <View>
          <Text className="mb-sm px-1 font-label-lg text-on-surface-variant dark:text-train-on-surface-variant">
            Resumen del Día
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            <View className="w-full flex-row items-center justify-between rounded-xl border border-outline-variant dark:border-train-outline-variant bg-surface-container dark:bg-train-surface-container p-md">
              <View>
                <Text className="font-label-md text-on-surface-variant dark:text-train-on-surface-variant">Ignoradas</Text>
                <Text className="font-display text-display text-on-surface dark:text-train-on-surface">0</Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-container-high dark:bg-train-surface-container-high">
                <Icon name="bell-off-outline" size={20} color={iconColor} />
              </View>
            </View>
            <View className="flex-1 rounded-xl bg-primary-container dark:bg-train-primary-container p-md">
              <Icon name="check-circle" size={20} color="#86a0cd" />
              <Text className="mt-sm text-label-md text-on-primary-container dark:text-train-on-primary-container opacity-80">Leídas</Text>
              <Text className="font-headline-lg text-on-primary-container dark:text-train-on-primary-container">0</Text>
            </View>
            <View className="flex-1 rounded-xl bg-surface-container-highest dark:bg-train-surface-container-highest p-md">
              <Icon name="clock-outline" size={20} color={iconColor} />
              <Text className="mt-sm text-label-md text-on-surface-variant dark:text-train-on-surface-variant">Pendientes</Text>
              <Text className="font-headline-lg text-on-surface dark:text-train-on-surface">0</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
