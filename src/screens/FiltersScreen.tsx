import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import TopAppBar from '../components/TopAppBar';
import Icon from '../components/Icon';

type Category = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  accent?: 'primary' | 'error';
};

const CATEGORIES: Category[] = [
  { key: 'bancos', label: 'Bancos', icon: 'bank-outline' },
  { key: 'pagos', label: 'Pagos', icon: 'credit-card-outline' },
  { key: 'trabajo', label: 'Trabajo', icon: 'briefcase-outline', accent: 'primary' },
  { key: 'seguridad', label: 'Seguridad', icon: 'security', accent: 'error' },
  { key: 'clientes', label: 'Clientes', icon: 'account-group-outline' },
  { key: 'entregas', label: 'Entregas', icon: 'truck-outline' },
];

export default function FiltersScreen() {
  const [sensitivity, setSensitivity] = useState(85);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    bancos: true,
    pagos: true,
    trabajo: true,
    seguridad: true,
    clientes: false,
    entregas: true,
  });
  const [threshold, setThreshold] = useState<'critico' | 'todo'>('critico');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <TopAppBar />
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="pb-xl pt-md">
        <View className="mb-lg">
          <Text className="mb-xs font-headline-lg-mobile text-primary">Filtros Inteligentes</Text>
          <Text className="font-body-md text-on-surface-variant">
            Personaliza qué notificaciones rompen tu escudo de silencio según su categoría y prioridad.
          </Text>
        </View>

        <View className="mb-xl rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <View className="mb-md flex-row items-center justify-between">
            <Text className="font-label-lg uppercase text-primary">Sensibilidad del filtro AI</Text>
            <Text className="font-bold text-primary">{Math.round(sensitivity)}%</Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={100}
            value={sensitivity}
            onValueChange={setSensitivity}
            minimumTrackTintColor="#002045"
            maximumTrackTintColor="#dae2fd"
            thumbTintColor="#002045"
          />
          <View className="mt-sm flex-row justify-between">
            <Text className="font-label-md text-on-surface-variant">Relajado</Text>
            <Text className="font-label-md text-on-surface-variant">Vigilante</Text>
          </View>
        </View>

        <View className="mb-xl">
          <Text className="mb-md font-label-lg uppercase tracking-wider text-primary">
            Prioridad por Categoría
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {CATEGORIES.map((cat) => (
              <View
                key={cat.key}
                className={`h-32 w-[47%] justify-between rounded-xl border border-outline-variant bg-white p-md ${
                  cat.accent === 'primary' ? 'border-l-4 border-l-primary' : ''
                } ${cat.accent === 'error' ? 'border-l-4 border-l-error' : ''}`}
              >
                <View className="flex-row items-start justify-between">
                  <Icon name={cat.icon} size={22} color={cat.accent === 'error' ? '#ba1a1a' : '#002045'} />
                  <Switch
                    value={enabled[cat.key]}
                    onValueChange={(v) => setEnabled((prev) => ({ ...prev, [cat.key]: v }))}
                    trackColor={{ false: '#dae2fd', true: '#002045' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <Text className="font-label-lg">{cat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text className="mb-md font-label-lg uppercase tracking-wider text-primary">Ajuste de Umbral</Text>
          <View className="space-y-sm">
            {(
              [
                { key: 'critico' as const, label: 'Leer automáticamente solo alertas críticas' },
                { key: 'todo' as const, label: 'Leer todas las permitidas' },
              ]
            ).map((opt) => {
              const active = threshold === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setThreshold(opt.key)}
                  className={`flex-row items-center justify-between rounded-xl border bg-white p-md ${
                    active ? 'border-primary bg-surface-container-high' : 'border-outline-variant'
                  }`}
                >
                  <Text className="flex-1 font-body-md">{opt.label}</Text>
                  {active && <Icon name="check-circle" size={20} color="#002045" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
