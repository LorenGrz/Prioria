import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import TopAppBar from '../components/TopAppBar';
import Icon from '../components/Icon';

const VOICES = [
  { id: 'lucia', name: 'Lucía', locale: 'Español (España)', icon: 'face-woman' as const },
  { id: 'enrique', name: 'Enrique', locale: 'Español (España)', icon: 'face-man' as const },
];

export default function VoiceScreen() {
  const [voiceId, setVoiceId] = useState('lucia');
  const [speed, setSpeed] = useState(1.0);
  const [testing, setTesting] = useState(false);

  const handleTest = () => {
    setTesting(true);
    setTimeout(() => setTesting(false), 2000);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <TopAppBar />
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="pb-xl pt-md">
        <View className="mb-lg flex-row items-center gap-sm rounded-lg bg-primary px-md py-xs">
          <Icon name="cloud-check-outline" size={20} color="#ffffff" />
          <Text className="font-label-lg text-white">Conectado a Amazon Polly</Text>
        </View>

        <Text className="mb-md font-headline-lg-mobile text-primary">Configuración de Voz</Text>

        {/* Voice selector */}
        <View className="mb-md rounded-xl border border-outline-variant bg-white p-md shadow-sm">
          <View className="mb-sm flex-row items-center gap-xs">
            <Icon name="account-circle-outline" size={20} color="#43474e" />
            <Text className="font-label-lg uppercase tracking-wider text-on-surface-variant">
              Selector de Voz
            </Text>
          </View>
          <View className="gap-sm">
            {VOICES.map((voice) => {
              const active = voice.id === voiceId;
              return (
                <Pressable
                  key={voice.id}
                  onPress={() => setVoiceId(voice.id)}
                  className={`flex-row items-center justify-between rounded-lg border p-sm ${
                    active ? 'border-outline bg-surface-container-low' : 'border-outline-variant'
                  }`}
                >
                  <View className="flex-row items-center gap-md">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-fixed">
                      <Icon name={voice.icon} size={20} color="#002045" />
                    </View>
                    <View>
                      <Text className="font-label-lg">{voice.name}</Text>
                      <Text className="text-label-md text-on-surface-variant">{voice.locale}</Text>
                    </View>
                  </View>
                  <Icon
                    name={active ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={active ? '#002045' : '#74777f'}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View className="mb-md rounded-xl border border-outline-variant bg-white p-md shadow-sm">
          <View className="mb-sm flex-row items-center gap-xs">
            <Icon name="translate" size={20} color="#43474e" />
            <Text className="font-label-lg uppercase tracking-wider text-on-surface-variant">
              Idioma de Lectura
            </Text>
          </View>
          <Pressable className="h-touch-target-min flex-row items-center justify-between rounded-lg border border-outline bg-surface-container-lowest px-md">
            <View className="flex-row items-center gap-xs">
              <Text className="font-bold text-body-md">Español</Text>
              <Text className="text-body-md text-on-surface-variant">(ES)</Text>
            </View>
            <Icon name="chevron-down" size={20} color="#131b2e" />
          </Pressable>
          <Text className="mt-sm px-xs text-label-md text-on-surface-variant">
            El idioma seleccionado optimiza la pronunciación y entonación de alertas críticas.
          </Text>
        </View>

        {/* Speed */}
        <View className="mb-xl rounded-xl border border-outline-variant bg-white p-md shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-xs">
              <Icon name="speedometer" size={20} color="#43474e" />
              <Text className="font-label-lg uppercase tracking-wider text-on-surface-variant">
                Velocidad de Lectura
              </Text>
            </View>
            <Text className="rounded-lg bg-primary-fixed px-sm py-xs font-bold text-primary">
              {speed.toFixed(1)}x
            </Text>
          </View>
          <View className="px-sm py-md">
            <Slider
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              value={speed}
              onValueChange={setSpeed}
              minimumTrackTintColor="#002045"
              maximumTrackTintColor="#e2e7ff"
              thumbTintColor="#002045"
            />
            <View className="mt-sm flex-row justify-between">
              <Text className="font-bold text-label-md text-on-surface-variant">Lento</Text>
              <Text className="font-bold text-label-md text-on-surface-variant">Normal</Text>
              <Text className="font-bold text-label-md text-on-surface-variant">Rápido</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleTest}
          className="h-touch-target-min flex-row items-center justify-center gap-xs rounded-lg bg-primary shadow-md active:opacity-90"
        >
          <Icon name={testing ? 'ear-hearing' : 'volume-high'} size={20} color="#ffffff" />
          <Text className="font-label-lg text-white">{testing ? 'Reproduciendo...' : 'Probar voz'}</Text>
        </Pressable>

        <View className="mt-lg flex-row items-center justify-center gap-sm opacity-60">
          <Text className="text-right text-label-md text-on-surface">
            Potenciado por{'\n'}
            <Text className="font-bold text-[14px] text-on-surface">Amazon Polly</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
