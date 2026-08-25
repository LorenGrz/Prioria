import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import Icon from '../components/Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 3;
const ONBOARDING_KEY = 'prioria_onboarding_done';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

type PermState = 'idle' | 'granted' | 'denied';

export default function OnboardingScreen({ navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [notifPerm, setNotifPerm] = useState<PermState>('idle');
  const [listenerPerm, setListenerPerm] = useState<PermState>('idle');
  const [batteryPerm, setBatteryPerm] = useState<PermState>('idle');
  const [granting, setGranting] = useState(false);

  const goToStep = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    navigation.replace('Main');
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) goToStep(step + 1);
    else finish();
  };

  const handlePermit = async () => {
    if (granting) return;
    setGranting(true);

    // 1. Request expo-notifications permission
    try {
      const N = await import('expo-notifications');
      await N.setNotificationChannelAsync('default', {
        name: 'Prioria',
        importance: N.AndroidImportance.HIGH,
      });
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true, shouldShowBanner: true,
          shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
        }),
      });
      const { status } = await N.requestPermissionsAsync();
      setNotifPerm(status === 'granted' ? 'granted' : 'denied');
    } catch {
      setNotifPerm('denied');
    }

    // 2. Open notification listener settings
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
        setListenerPerm('granted'); // optimistic — user sees the settings
      }
    } catch {
      setListenerPerm('denied');
    }

    // 3. Battery optimization exemption — without this, aggressive OEM
    // battery managers can kill the whole process (listener included) in
    // the background, so notifications never get processed while closed.
    try {
      const alreadyIgnoring: boolean =
        (await NativeModules.NotificationModule?.isIgnoringBatteryOptimizations?.()) ?? false;
      if (alreadyIgnoring) {
        setBatteryPerm('granted');
      } else {
        NativeModules.NotificationModule?.requestIgnoreBatteryOptimizations?.();
        setBatteryPerm('granted'); // optimistic — user sees the system dialog
      }
    } catch {
      setBatteryPerm('denied');
    }

    setGranting(false);
  };

  // Check access when user returns from settings/system dialogs
  const checkListenerAccess = async () => {
    try {
      const N = await import('expo-notifications');
      const { status } = await N.getPermissionsAsync();
      setNotifPerm(status === 'granted' ? 'granted' : 'denied');
    } catch {}
    try {
      const isIgnoring: boolean =
        (await NativeModules.NotificationModule?.isIgnoringBatteryOptimizations?.()) ?? false;
      setBatteryPerm(isIgnoring ? 'granted' : 'denied');
    } catch {}
    // Listener service access can't be checked programmatically without native module —
    // mark as granted optimistically if user came back from settings
    if (listenerPerm !== 'granted') setListenerPerm('granted');
  };

  const permOk = notifPerm === 'granted';
  const listenerOk = listenerPerm === 'granted';
  const batteryOk = batteryPerm === 'granted';
  const bothGranted = permOk && listenerOk && batteryOk;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="h-touch-target-min w-full flex-row items-center gap-xs border-b border-outline-variant bg-background px-margin-mobile">
        <Icon name="shield-check" size={22} color="#002045" />
        <Text className="font-display text-[22px] leading-none tracking-tight text-primary">
          Prioria
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        className="flex-1"
      >
        {/* STEP 0: Welcome */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-margin-mobile">
          <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: '#dae2fd', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <Icon name="bell-ring" size={88} color="#002045" />
          </View>
          <Text className="mb-md text-center font-headline-lg text-primary">
            Atención Blindada
          </Text>
          <Text className="text-center font-body-lg text-on-surface-variant">
            Prioria filtra y lee en voz alta solo las notificaciones que de verdad importan — para que puedas concentrarte en lo que hacés.
          </Text>
        </View>

        {/* STEP 1: Permissions */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-margin-mobile">
          <Text className="mb-xs font-headline-lg text-primary">Permisos necesarios</Text>
          <Text className="mb-lg font-body-md text-on-surface-variant">
            Prioria necesita dos accesos para funcionar. Presioná el botón y activá los dos.
          </Text>

          {/* Notificaciones */}
          <View className="mb-md flex-row items-center gap-md rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: permOk ? '#dcfce7' : '#dae2fd', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={permOk ? 'check-circle' : 'bell-outline'} size={22} color={permOk ? '#16a34a' : '#002045'} />
            </View>
            <View className="flex-1">
              <Text className="font-label-lg text-on-surface">Notificaciones</Text>
              <Text className="text-label-md text-on-surface-variant">
                {permOk ? 'Concedido' : 'Para recibir alertas locales'}
              </Text>
            </View>
            {permOk && <Icon name="check" size={18} color="#16a34a" />}
          </View>

          {/* Listener */}
          <View className="mb-md flex-row items-center gap-md rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: listenerOk ? '#dcfce7' : '#dae2fd', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={listenerOk ? 'check-circle' : 'shield-key-outline'} size={22} color={listenerOk ? '#16a34a' : '#002045'} />
            </View>
            <View className="flex-1">
              <Text className="font-label-lg text-on-surface">Acceso a notificaciones del sistema</Text>
              <Text className="text-label-md text-on-surface-variant">
                {listenerOk ? 'Abriste los ajustes — activalo en la lista' : 'Para interceptar alertas de otras apps'}
              </Text>
            </View>
            {listenerOk && <Icon name="check" size={18} color="#16a34a" />}
          </View>

          {/* Battery optimization */}
          <View className="mb-xl flex-row items-center gap-md rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: batteryOk ? '#dcfce7' : '#dae2fd', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={batteryOk ? 'check-circle' : 'battery-alert-variant-outline'} size={22} color={batteryOk ? '#16a34a' : '#002045'} />
            </View>
            <View className="flex-1">
              <Text className="font-label-lg text-on-surface">Sin restricciones de batería</Text>
              <Text className="text-label-md text-on-surface-variant">
                {batteryOk ? 'Concedido' : 'Para seguir escuchando notificaciones con la app cerrada'}
              </Text>
            </View>
            {batteryOk && <Icon name="check" size={18} color="#16a34a" />}
          </View>

          {!bothGranted ? (
            <Pressable
              onPress={handlePermit}
              disabled={granting}
              className="h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl bg-primary active:opacity-90"
            >
              <Icon name="shield-check" size={20} color="#ffffff" />
              <Text className="font-label-lg text-on-primary">
                {granting ? 'Activando...' : 'Permitir todo'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={checkListenerAccess}
              className="h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl border border-primary active:opacity-90"
            >
              <Icon name="refresh" size={20} color="#002045" />
              <Text className="font-label-lg text-primary">Verificar accesos</Text>
            </Pressable>
          )}
        </View>

        {/* STEP 2: Ready */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-margin-mobile">
          <View className="mb-xl h-40 w-40 items-center justify-center rounded-full bg-green-50">
            <Icon name="shield-check" size={72} color="#16a34a" />
          </View>
          <Text className="mb-md text-center font-headline-lg text-primary">
            ¡Todo listo!
          </Text>
          <Text className="text-center font-body-lg text-on-surface-variant">
            Prioria ya puede interceptar y priorizar tus notificaciones. Podés configurar más opciones desde Ajustes.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View className="w-full gap-sm bg-background px-margin-mobile pt-md pb-lg">
        <View className="mb-sm flex-row justify-center gap-xs">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${i === step ? 'w-8 bg-primary' : 'w-2 bg-outline-variant'}`}
            />
          ))}
        </View>
        <Pressable
          onPress={handleNext}
          className={`h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl shadow-md active:opacity-90 ${
            step === TOTAL_STEPS - 1 ? 'bg-primary' : step === 1 && !bothGranted ? 'bg-surface-container-high' : 'bg-primary'
          }`}
        >
          <Text className={`font-display text-lg ${step === 1 && !bothGranted ? 'text-on-surface-variant' : 'text-on-primary'}`}>
            {step === TOTAL_STEPS - 1 ? 'Comenzar' : 'Continuar'}
          </Text>
          {step < TOTAL_STEPS - 1 && (
            <Icon name="arrow-right" size={20} color={step === 1 && !bothGranted ? '#74777f' : '#ffffff'} />
          )}
        </Pressable>
        {step < TOTAL_STEPS - 1 && (
          <Pressable onPress={handleNext} className="h-touch-target-min items-center justify-center">
            <Text className="font-label-lg text-on-surface-variant">Omitir por ahora</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
