import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopAppBar from '../components/TopAppBar';
import Icon from '../components/Icon';

export default function HomeScreen() {
  const [voicePaused, setVoicePaused] = useState(false);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <TopAppBar />
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="space-y-lg py-lg">
        {/* Status indicator */}
        <View className="flex-row items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <View className="flex-row items-center gap-sm">
            <View className="h-3 w-3 rounded-full bg-green-500" />
            <Text className="font-label-lg text-on-surface">Modo escucha activo</Text>
          </View>
          <Icon name="waves" size={20} color="#43474e" />
        </View>

        {/* Voice toggle */}
        <Pressable
          onPress={() => setVoicePaused((v) => !v)}
          className={`h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl shadow-sm active:opacity-90 ${voicePaused ? 'bg-error' : 'bg-primary'}`}
        >
          <Icon name={voicePaused ? 'play-circle-outline' : 'microphone-off'} size={20} color="#ffffff" />
          <Text className="font-label-lg text-on-primary">
            {voicePaused ? 'Reanudar Lectura de Voz' : 'Pausar Lectura de Voz'}
          </Text>
        </Pressable>

        {/* Latest notification */}
        <View>
          <Text className="mb-sm px-1 font-label-lg text-on-surface-variant">Última Notificación</Text>
          <View className="flex-row overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <View className="w-2 bg-error" />
            <View className="flex-1 p-md">
              <View className="mb-xs flex-row items-start justify-between">
                <View className="flex-row items-center gap-xs">
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-surface-container-highest">
                    <Icon name="wallet-outline" size={18} color="#002045" />
                  </View>
                  <Text className="font-label-lg text-primary">Mercado Pago</Text>
                </View>
                <View className="rounded-full bg-error-container px-sm py-0.5">
                  <Text className="text-[10px] font-bold text-on-error-container">CRÍTICA</Text>
                </View>
              </View>
              <Text className="mb-xs font-headline-md text-on-surface">Transferencia de $150.000</Text>
              <Text className="text-body-md text-on-surface-variant">Has recibido un pago de Juan Pérez.</Text>
              <View className="mt-md flex-row gap-sm">
                <Pressable className="flex-1 items-center rounded-lg border-2 border-primary py-xs active:bg-surface-container-low">
                  <Text className="font-label-lg text-primary">Ver detalle</Text>
                </Pressable>
                <Pressable className="flex-1 items-center rounded-lg bg-primary py-xs active:opacity-90">
                  <Text className="font-label-lg text-on-primary">Abrir App</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Daily summary */}
        <View>
          <Text className="mb-sm px-1 font-label-lg text-on-surface-variant">Resumen del Día</Text>
          <View className="flex-row flex-wrap gap-sm">
            <View className="w-full flex-row items-center justify-between rounded-xl border border-outline-variant bg-surface-container p-md">
              <View>
                <Text className="font-label-md text-on-surface-variant">Ignoradas</Text>
                <Text className="font-display text-display text-on-surface">45</Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-white/50">
                <Icon name="bell-off-outline" size={20} color="#43474e" />
              </View>
            </View>
            <View className="flex-1 rounded-xl bg-primary-container p-md">
              <Icon name="check-circle" size={20} color="#86a0cd" />
              <Text className="mt-sm text-label-md text-on-primary-container opacity-80">Leídas</Text>
              <Text className="font-headline-lg text-on-primary-container">12</Text>
            </View>
            <View className="flex-1 rounded-xl bg-surface-container-highest p-md">
              <Icon name="clock-outline" size={20} color="#131b2e" />
              <Text className="mt-sm text-label-md text-on-surface-variant">Pendientes</Text>
              <Text className="font-headline-lg text-on-surface">3</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
