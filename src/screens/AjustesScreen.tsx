import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Icon from '../components/Icon';
import { useTheme } from '../context/ThemeContext';

const VOICES = [
  { id: 'lucia', name: 'Lucía', locale: 'Español (España)', icon: 'face-woman' as const },
  { id: 'enrique', name: 'Enrique', locale: 'Español (España)', icon: 'face-man' as const },
];

type PermStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

function StatusBadge({ status }: { status: PermStatus | null }) {
  if (!status) return null;
  const cfg: Record<PermStatus, { bg: string; text: string; label: string }> = {
    granted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Concedido' },
    denied: { bg: 'bg-error-container', text: 'text-on-error-container', label: 'Denegado' },
    undetermined: { bg: 'bg-surface-container', text: 'text-on-surface-variant', label: 'Sin definir' },
    unavailable: { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant', label: 'No disponible' },
  };
  const c = cfg[status];
  return (
    <View className={`rounded-full px-sm py-0.5 ${c.bg}`}>
      <Text className={`text-[11px] font-bold ${c.text}`}>{c.label}</Text>
    </View>
  );
}

function SectionTitle({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <Text className={`mb-md font-headline-lg-mobile ${isDark ? 'text-train-primary' : 'text-primary'}`}>{label}</Text>
  );
}

export default function AjustesScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [voiceId, setVoiceId] = useState('lucia');
  const [speed, setSpeed] = useState(1.0);
  const [testing, setTesting] = useState(false);

  const [permStatus, setPermStatus] = useState<PermStatus | null>(null);
  const [lastNotifId, setLastNotifId] = useState<string | null>(null);
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);

  const iconColor = isDark ? '#c8c4d7' : '#43474e';
  const cardBg    = isDark ? '#1a2123' : '#ffffff';
  const trackMin  = isDark ? '#c6bfff' : '#002045';
  const trackMax  = isDark ? '#2f3638' : '#dae2fd';
  const thumbColor = isDark ? '#c6bfff' : '#002045';
  const devCardBg  = isDark ? '#161d1f' : undefined;

  const handleTest = async () => {
    if (testing) { Speech.stop(); setTesting(false); return; }
    setTesting(true);
    const text = voiceId === 'lucia'
      ? 'Hola, soy Lucía. Voy a leer tus notificaciones más importantes.'
      : 'Hola, soy Enrique. Estoy listo para ayudarte con tus alertas.';
    await Speech.speak(text, {
      language: 'es-ES',
      rate: speed,
      onDone: () => setTesting(false),
      onError: () => setTesting(false),
    });
  };

  async function checkPermission() {
    try {
      const N = await import('expo-notifications');
      const { status } = await N.getPermissionsAsync();
      setPermStatus(status as PermStatus);
    } catch { setPermStatus('unavailable'); }
  }

  async function requestPermission() {
    try {
      const N = await import('expo-notifications');
      const { status } = await N.requestPermissionsAsync();
      setPermStatus(status as PermStatus);
    } catch {
      setPermStatus('unavailable');
      Alert.alert('No disponible', 'Requiere el APK descargado desde EAS, no Expo Go.');
    }
  }

  async function sendLocal() {
    try {
      const N = await import('expo-notifications');
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true, shouldShowBanner: true,
          shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
        }),
      });
      const id = await N.scheduleNotificationAsync({
        content: { title: 'Prioria — Prueba', body: 'Notificación local de prueba.' },
        trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
      });
      setLastNotifId(id.slice(0, 20) + '…');
      Alert.alert('Enviada', 'Aparece en 3 segundos.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No disponible en Expo Go.');
    }
  }

  async function fetchToken() {
    try {
      const N = await import('expo-notifications');
      const { data } = await N.getExpoPushTokenAsync();
      setTokenMsg(data);
    } catch {
      setTokenMsg('Requiere development build.');
    }
  }

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-background dark:bg-train-background">
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="pb-xl pt-md">

        {/* ── Apariencia ── */}
        <View className="mb-lg flex-row items-center justify-between rounded-xl border border-outline-variant dark:border-train-outline-variant bg-surface-container-low dark:bg-train-surface-container-low p-md">
          <View className="flex-row items-center gap-sm">
            <Icon name={isDark ? 'weather-night' : 'weather-sunny'} size={20} color={iconColor} />
            <Text className="font-label-lg text-on-surface dark:text-train-on-surface">Modo oscuro</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#c4c6cf', true: '#6c5ce7' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* ── Voz ── */}
        <SectionTitle label="Configuración de Voz" isDark={isDark} />

        <View className="mb-lg flex-row items-center gap-sm rounded-lg bg-surface-container-low dark:bg-train-surface-container-low border border-outline-variant dark:border-train-outline-variant px-md py-xs">
          <Icon name="microphone-outline" size={20} color={iconColor} />
          <Text className="font-label-lg text-on-surface-variant dark:text-train-on-surface-variant">TTS nativo del dispositivo</Text>
          <View className="ml-auto rounded-full bg-orange-100 px-sm py-0.5">
            <Text className="text-[11px] font-bold text-orange-700">Dev</Text>
          </View>
        </View>

        {/* Selector de voz */}
        <View
          className="mb-md rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
          style={{ backgroundColor: cardBg }}
        >
          <View className="mb-sm flex-row items-center gap-xs">
            <Icon name="account-circle-outline" size={20} color={iconColor} />
            <Text className="font-label-lg uppercase tracking-wider text-on-surface-variant dark:text-train-on-surface-variant">Selector de Voz</Text>
          </View>
          <View className="gap-sm">
            {VOICES.map((voice) => {
              const active = voice.id === voiceId;
              return (
                <Pressable
                  key={voice.id}
                  onPress={() => setVoiceId(voice.id)}
                  className={`flex-row items-center justify-between rounded-lg border p-sm ${
                    active
                      ? 'border-outline dark:border-train-outline bg-surface-container-low dark:bg-train-surface-container-low'
                      : 'border-outline-variant dark:border-train-outline-variant'
                  }`}
                >
                  <View className="flex-row items-center gap-md">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-fixed">
                      <Icon name={voice.icon} size={20} color="#002045" />
                    </View>
                    <View>
                      <Text className="font-label-lg text-on-surface dark:text-train-on-surface">{voice.name}</Text>
                      <Text className="text-label-md text-on-surface-variant dark:text-train-on-surface-variant">{voice.locale}</Text>
                    </View>
                  </View>
                  <Icon
                    name={active ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={active ? (isDark ? '#c6bfff' : '#002045') : iconColor}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Idioma */}
        <View
          className="mb-md rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
          style={{ backgroundColor: cardBg }}
        >
          <View className="mb-sm flex-row items-center gap-xs">
            <Icon name="translate" size={20} color={iconColor} />
            <Text className="font-label-lg uppercase tracking-wider text-on-surface-variant dark:text-train-on-surface-variant">Idioma de Lectura</Text>
          </View>
          <Pressable className="h-touch-target-min flex-row items-center justify-between rounded-lg border border-outline dark:border-train-outline bg-surface-container-lowest dark:bg-train-surface-container px-md">
            <View className="flex-row items-center gap-xs">
              <Text className="font-bold text-body-md text-on-surface dark:text-train-on-surface">Español</Text>
              <Text className="text-body-md text-on-surface-variant dark:text-train-on-surface-variant">(ES)</Text>
            </View>
            <Icon name="chevron-down" size={20} color={iconColor} />
          </Pressable>
        </View>

        {/* Velocidad */}
        <View
          className="mb-md rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
          style={{ backgroundColor: cardBg }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-xs">
              <Icon name="speedometer" size={20} color={iconColor} />
              <Text className="font-label-lg uppercase tracking-wider text-on-surface-variant dark:text-train-on-surface-variant">Velocidad de Lectura</Text>
            </View>
            <Text className="rounded-lg bg-primary-fixed px-sm py-xs font-bold text-primary dark:text-train-primary">{speed.toFixed(1)}x</Text>
          </View>
          <View className="px-sm py-md">
            <Slider
              minimumValue={0.5} maximumValue={2.0} step={0.1}
              value={speed} onValueChange={setSpeed}
              minimumTrackTintColor={trackMin}
              maximumTrackTintColor={trackMax}
              thumbTintColor={thumbColor}
            />
            <View className="mt-sm flex-row justify-between">
              <Text className="font-bold text-label-md text-on-surface-variant dark:text-train-on-surface-variant">Lento</Text>
              <Text className="font-bold text-label-md text-on-surface-variant dark:text-train-on-surface-variant">Normal</Text>
              <Text className="font-bold text-label-md text-on-surface-variant dark:text-train-on-surface-variant">Rápido</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleTest}
          className="mb-xl h-touch-target-min flex-row items-center justify-center gap-xs rounded-lg bg-primary shadow-md active:opacity-90"
        >
          <Icon name={testing ? 'ear-hearing' : 'volume-high'} size={20} color="#ffffff" />
          <Text className="font-label-lg text-white">{testing ? 'Reproduciendo...' : 'Probar voz'}</Text>
        </Pressable>

        {/* ── Herramientas de desarrollo ── */}
        <View className="mb-md flex-row items-center gap-sm">
          <View className="h-px flex-1 bg-outline-variant dark:bg-train-outline-variant" />
          <Text className="text-label-md text-on-surface-variant dark:text-train-on-surface-variant">Herramientas de desarrollo</Text>
          <View className="h-px flex-1 bg-outline-variant dark:bg-train-outline-variant" />
        </View>

        {/* Permiso notificaciones */}
        <View
          className="mb-md rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
          style={devCardBg ? { backgroundColor: devCardBg } : undefined}
        >
          <View className="mb-sm flex-row items-center justify-between">
            <View className="flex-row items-center gap-sm">
              <Icon name="bell-ring-outline" size={18} color={iconColor} />
              <Text className="font-label-lg text-on-surface dark:text-train-on-surface">Permiso notificaciones</Text>
            </View>
            <StatusBadge status={permStatus} />
          </View>
          <View className="flex-row gap-sm">
            <Pressable onPress={requestPermission} className="flex-1 h-10 flex-row items-center justify-center gap-xs rounded-lg bg-primary active:opacity-80">
              <Icon name="bell-plus-outline" size={16} color="#fff" />
              <Text className="font-label-lg text-on-primary">Solicitar</Text>
            </Pressable>
            <Pressable onPress={checkPermission} className="flex-1 h-10 flex-row items-center justify-center gap-xs rounded-lg border border-primary active:opacity-80">
              <Icon name="refresh" size={16} color={isDark ? '#c6bfff' : '#86a0cd'} />
              <Text className="font-label-lg text-primary dark:text-train-primary">Verificar</Text>
            </Pressable>
          </View>
        </View>

        {/* Notificación local */}
        <View
          className="mb-md rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
          style={devCardBg ? { backgroundColor: devCardBg } : undefined}
        >
          <View className="mb-sm flex-row items-center gap-sm">
            <Icon name="bell-outline" size={18} color={iconColor} />
            <Text className="font-label-lg text-on-surface dark:text-train-on-surface">Notificación local (3 s)</Text>
          </View>
          <Pressable onPress={sendLocal} className="h-10 flex-row items-center justify-center gap-xs rounded-lg bg-primary active:opacity-80">
            <Icon name="send-outline" size={16} color="#fff" />
            <Text className="font-label-lg text-on-primary">Enviar prueba</Text>
          </Pressable>
          {lastNotifId && (
            <Text className="mt-xs text-body-sm text-on-surface-variant dark:text-train-on-surface-variant">ID: {lastNotifId}</Text>
          )}
        </View>

        {/* Token */}
        <View
          className="mb-md rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
          style={devCardBg ? { backgroundColor: devCardBg } : undefined}
        >
          <View className="mb-sm flex-row items-center gap-sm">
            <Icon name="identifier" size={18} color={iconColor} />
            <Text className="font-label-lg text-on-surface dark:text-train-on-surface">Expo Push Token</Text>
          </View>
          {tokenMsg
            ? <Text className="mb-sm rounded-lg bg-surface-container-highest dark:bg-train-surface-container-highest p-sm text-body-sm text-on-surface dark:text-train-on-surface" selectable>{tokenMsg}</Text>
            : <Text className="mb-sm text-body-sm text-on-surface-variant dark:text-train-on-surface-variant">Sin token.</Text>
          }
          <Pressable onPress={fetchToken} className="h-10 flex-row items-center justify-center gap-xs rounded-lg border border-primary active:opacity-80">
            <Icon name="key-outline" size={16} color={isDark ? '#c6bfff' : '#86a0cd'} />
            <Text className="font-label-lg text-primary dark:text-train-primary">Obtener token</Text>
          </Pressable>
        </View>

        {/* NotificationListenerService */}
        <View
          className="mb-xl rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
          style={devCardBg ? { backgroundColor: devCardBg } : undefined}
        >
          <View className="mb-sm flex-row items-center gap-sm">
            <Icon name="shield-key-outline" size={18} color={iconColor} />
            <Text className="font-label-lg text-on-surface dark:text-train-on-surface">Acceso a notificaciones del sistema</Text>
          </View>
          <Text className="mb-sm text-body-sm text-on-surface-variant dark:text-train-on-surface-variant">
            Habilita NotificationListenerService en los ajustes de Android.
          </Text>
          <Pressable onPress={Linking.openSettings} className="h-10 flex-row items-center justify-center gap-xs rounded-lg border border-primary active:opacity-80">
            <Icon name="cog-outline" size={16} color={isDark ? '#c6bfff' : '#86a0cd'} />
            <Text className="font-label-lg text-primary dark:text-train-primary">Abrir ajustes</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
