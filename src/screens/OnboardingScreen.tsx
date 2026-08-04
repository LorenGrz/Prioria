import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  Image,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import Icon from '../components/Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 4;

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [voiceType, setVoiceType] = useState<'femenina' | 'masculina'>('masculina');
  const [threshold, setThreshold] = useState(8);

  const goToStep = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      goToStep(step + 1);
    } else {
      navigation.replace('Main');
    }
  };

  const handleSkip = () => goToStep(TOTAL_STEPS - 1);

  const handleAllow = () => {
    setPermissionGranted(true);
    setTimeout(() => handleNext(), 400);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      {/* Top App Bar */}
      <View className="h-touch-target-min w-full flex-row items-center justify-between border-b border-outline-variant bg-background px-margin-mobile">
        <View className="flex-row items-center gap-xs">
          <Icon name="shield-check" size={22} color="#002045" />
          <Text className="font-display text-[22px] leading-none tracking-tight text-primary">
            Prioria
          </Text>
        </View>
        <Icon name="access-point" size={22} color="#43474e" />
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
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-margin-mobile">
          <View className="items-center space-y-md">
            <View className="mb-md h-64 w-64 items-center justify-center rounded-full bg-primary-container/10">
              <Icon name="bell-ring" size={80} color="#002045" />
            </View>
            <Text className="text-center font-headline-lg text-primary">Atención Blindada</Text>
            <Text className="px-sm text-center font-body-lg text-on-surface-variant">
              Filtramos tus notificaciones importantes para que no pierdas el ritmo.
            </Text>
          </View>
        </View>

        {/* STEP 1: Permissions */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-margin-mobile">
          <View className="space-y-xl">
            <View className="space-y-xs">
              <Text className="font-headline-lg text-primary">Permisos Críticos</Text>
              <Text className="font-body-md text-on-surface-variant">
                Para proteger tu flujo de trabajo, necesitamos permiso para gestionar tus alertas.
              </Text>
            </View>
            <View className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
              <View className="absolute left-0 top-0 h-full w-1 bg-primary" />
              <View className="flex-row items-start gap-md">
                <View className="rounded-lg bg-primary-container p-xs">
                  <Icon name="lock-open-outline" size={20} color="#86a0cd" />
                </View>
                <View className="flex-1">
                  <Text className="font-label-lg text-on-surface">Acceso a Notificaciones</Text>
                  <Text className="mt-1 text-label-md text-on-surface-variant">
                    Necesario para identificar riesgos en tiempo real.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handleAllow}
                className={`mt-md h-touch-target-min items-center justify-center rounded-lg ${permissionGranted ? 'bg-green-600' : 'bg-primary'} active:opacity-90`}
              >
                <Text className="font-label-lg text-on-primary">
                  {permissionGranted ? 'Permitido' : 'Permitir'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* STEP 2: Preferences */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-margin-mobile pt-md">
          <ScrollView showsVerticalScrollIndicator={false} className="space-y-xl">
            <View className="space-y-xs">
              <Text className="font-headline-lg text-primary">Tus Preferencias</Text>
              <Text className="font-body-md text-on-surface-variant">
                Personaliza cómo Prioria se comunica contigo durante la actividad.
              </Text>
            </View>

            <View className="mt-lg space-y-sm">
              <View className="mb-sm flex-row items-center gap-xs">
                <Icon name="translate" size={16} color="#002045" />
                <Text className="font-label-lg text-primary">Idioma de Voz</Text>
              </View>
              <View className="flex-row items-center justify-between rounded-xl border-2 border-primary bg-primary-container/5 p-md">
                <Text className="font-label-lg text-on-surface">Español (ES)</Text>
                <Icon name="check-circle" size={20} color="#002045" />
              </View>
            </View>

            <View className="mt-lg space-y-sm">
              <View className="mb-sm flex-row items-center gap-xs">
                <Icon name="account-voice" size={16} color="#002045" />
                <Text className="font-label-lg text-primary">Tipo de Voz</Text>
              </View>
              <View className="flex-row gap-sm">
                {(['femenina', 'masculina'] as const).map((option) => {
                  const active = voiceType === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setVoiceType(option)}
                      className={`flex-1 items-center rounded-xl border p-md ${active ? 'border-2 border-primary bg-primary-container/5' : 'border-outline-variant bg-white'}`}
                    >
                      <Icon
                        name={option === 'femenina' ? 'gender-female' : 'gender-male'}
                        size={22}
                        color={active ? '#002045' : '#131b2e'}
                      />
                      <Text className={`mt-xs font-label-md ${active ? 'text-primary' : ''}`}>
                        {option === 'femenina' ? 'Femenina' : 'Masculina'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mt-lg space-y-sm pb-xl">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-xs">
                  <Icon name="lightning-bolt" size={16} color="#002045" />
                  <Text className="font-label-lg text-primary">Umbral de Prioridad</Text>
                </View>
                <Text className="font-bold text-label-md text-primary">
                  {threshold >= 7 ? 'ALTO' : threshold >= 4 ? 'MEDIO' : 'BAJO'}
                </Text>
              </View>
              <Slider
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={threshold}
                onValueChange={setThreshold}
                minimumTrackTintColor="#002045"
                maximumTrackTintColor="#c4c6cf"
                thumbTintColor="#002045"
              />
              <Text className="italic text-label-md text-on-surface-variant">
                Solo recibirás alertas críticas y mensajes de supervisores.
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* STEP 3: Feature highlight */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center px-margin-mobile">
          <View className="space-y-xl">
            <View className="items-center space-y-xs">
              <Text className="font-headline-lg text-primary">Lectura Inteligente</Text>
              <Text className="font-body-md text-on-surface-variant">
                Manos libres, mente enfocada.
              </Text>
            </View>
            <View className="space-y-md rounded-2xl border border-outline-variant bg-surface-container-low p-lg shadow-sm">
              <View className="flex-row items-center gap-md">
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTY32USCLngmfjosBTTo2tT_OKEwxHLdn8cAHhe_FNpr0TIK8dnbsapFgic9ZLtY_2TjQ4r9QFqP9KVkh0BXiXEPwDhdUXhrpn_adUnOsLXdrBWmGKXHERFBK4cHK8dm2N8ej3fds-PqINLiDjcjMBN740IoXALaUemYaurZbWu97GtmjnM0DDsUhFLEqMZOr2DVmXWaTqISipRDpP9eRdJNiB8nF32SeTKQMM09jWIXWQMl-YM1Fq' }}
                  className="h-12 w-12 flex-shrink-0 rounded-full bg-outline-variant"
                />
                <View className="flex-1">
                  <Text className="font-label-lg text-on-surface">Supervisor García</Text>
                  <Text className="text-label-md text-on-surface-variant">Hace 1 min • ALTA PRIORIDAD</Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-error">
                  <Icon name="alert-circle-outline" size={16} color="#fff" />
                </View>
              </View>
              <View className="flex-row items-center justify-between rounded-xl border border-outline-variant bg-white p-md">
                <View className="flex-row items-center gap-sm">
                  <Icon name="volume-high" size={20} color="#002045" />
                  <Text className="font-semibold font-body-md text-primary">Lectura automática...</Text>
                </View>
              </View>
              <Text className="italic font-body-md text-on-surface">
                "Atención: Reajuste de ruta necesario por cierre de vía en 5km. Confirma recepción."
              </Text>
            </View>
            <View className="flex-row items-center gap-md rounded-xl border border-primary/20 bg-primary-container/10 p-md">
              <Icon name="volume-mute" size={20} color="#002045" />
              <Text className="flex-1 font-label-md text-primary">
                Lectura automática de alertas críticas activada por defecto.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom navigation */}
      <View className="w-full gap-sm bg-background px-margin-mobile pt-lg">
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
          className={`h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl shadow-md active:opacity-90 ${step === TOTAL_STEPS - 1 ? 'bg-primary-container' : 'bg-primary'}`}
        >
          <Text className={`font-display text-lg ${step === TOTAL_STEPS - 1 ? 'text-on-primary-container' : 'text-on-primary'}`}>
            {step === TOTAL_STEPS - 1 ? 'Comenzar' : 'Continuar'}
          </Text>
          {step < TOTAL_STEPS - 1 && <Icon name="arrow-right" size={20} color="#ffffff" />}
        </Pressable>
        {step < TOTAL_STEPS - 1 && (
          <Pressable onPress={handleSkip} className="h-touch-target-min items-center justify-center">
            <Text className="font-label-lg text-on-surface-variant">Omitir por ahora</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
