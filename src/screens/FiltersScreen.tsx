import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Icon from '../components/Icon';
import RulesModal from '../components/RulesModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';

type Category = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  accent?: 'primary' | 'error';
};

const CATEGORIES: Category[] = [
  { key: 'bancos',    label: 'Bancos',    icon: 'bank-outline' },
  { key: 'pagos',     label: 'Pagos',     icon: 'credit-card-outline' },
  { key: 'trabajo',   label: 'Trabajo',   icon: 'briefcase-outline', accent: 'primary' },
  { key: 'seguridad', label: 'Seguridad', icon: 'security',          accent: 'error' },
  { key: 'clientes',  label: 'Clientes',  icon: 'account-group-outline' },
  { key: 'entregas',  label: 'Entregas',  icon: 'truck-outline' },
];

export default function FiltersScreen() {
  const [sensitivity, setSensitivity] = useState(85);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    bancos: true, pagos: true, trabajo: true,
    seguridad: true, clientes: false, entregas: true,
  });
  const [threshold, setThreshold] = useState<'critico' | 'todo'>('critico');
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const { isDark } = useTheme();
  const { token } = useAuth();

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load preferences from backend on mount
  useEffect(() => {
    if (!token) return;
    apiCall<{
      sensitivity?: number;
      categories?: Record<string, boolean>;
      autoReadMode?: string;
    }>('/preferences', 'GET', undefined, token)
      .then((prefs) => {
        if (prefs.sensitivity != null) setSensitivity(prefs.sensitivity);
        if (prefs.categories) setEnabled(prefs.categories);
        if (prefs.autoReadMode === 'critico' || prefs.autoReadMode === 'todo') {
          setThreshold(prefs.autoReadMode);
        }
      })
      .catch(() => {});
  }, [token]);

  function scheduleSave(patch: Record<string, unknown>) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!token) return;
      apiCall('/preferences', 'PUT', patch, token).catch(() => {});
    }, 1500);
  }

  const cardBg    = isDark ? '#1a2123' : '#ffffff';
  const trackMin  = isDark ? '#c6bfff' : '#002045';
  const trackMax  = isDark ? '#2f3638' : '#dae2fd';
  const thumbColor = isDark ? '#c6bfff' : '#002045';

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-background dark:bg-train-background">
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="pb-xl pt-md">
        <View className="mb-lg">
          <Text className="mb-xs font-headline-lg-mobile text-primary dark:text-train-primary">
            Filtros Inteligentes
          </Text>
          <Text className="font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
            Personaliza qué notificaciones rompen tu escudo de silencio según su categoría y prioridad.
          </Text>
        </View>

        {/* Sensitivity */}
        <View
          className="mb-xl rounded-xl border border-outline-variant dark:border-train-outline-variant p-md"
          style={{ backgroundColor: cardBg }}
        >
          <View className="mb-md flex-row items-center justify-between">
            <Text className="font-label-lg uppercase text-primary dark:text-train-primary">
              Sensibilidad del filtro AI
            </Text>
            <Text className="font-bold text-primary dark:text-train-primary">{Math.round(sensitivity)}%</Text>
          </View>
          <Slider
            minimumValue={0} maximumValue={100}
            value={sensitivity}
            onValueChange={setSensitivity}
            onSlidingComplete={(v) => scheduleSave({ sensitivity: Math.round(v) })}
            minimumTrackTintColor={trackMin}
            maximumTrackTintColor={trackMax}
            thumbTintColor={thumbColor}
          />
          <View className="mt-sm flex-row justify-between">
            <Text className="font-label-md text-on-surface-variant dark:text-train-on-surface-variant">Relajado</Text>
            <Text className="font-label-md text-on-surface-variant dark:text-train-on-surface-variant">Vigilante</Text>
          </View>
        </View>

        {/* Categories */}
        <View className="mb-xl">
          <Text className="mb-md font-label-lg uppercase tracking-wider text-primary dark:text-train-primary">
            Prioridad por Categoría
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {CATEGORIES.map((cat) => (
              <View
                key={cat.key}
                className={`h-32 w-[47%] justify-between rounded-xl border border-outline-variant dark:border-train-outline-variant p-md ${
                  cat.accent === 'primary' ? 'border-l-4 border-l-primary dark:border-l-train-primary' : ''
                } ${cat.accent === 'error' ? 'border-l-4 border-l-error' : ''}`}
                style={{ backgroundColor: cardBg }}
              >
                <View className="flex-row items-start justify-between">
                  <Icon
                    name={cat.icon}
                    size={22}
                    color={cat.accent === 'error' ? '#ba1a1a' : isDark ? '#c6bfff' : '#002045'}
                  />
                  <Switch
                    value={enabled[cat.key]}
                    onValueChange={(v) => {
                      const next = { ...enabled, [cat.key]: v };
                      setEnabled(next);
                      scheduleSave({ categories: next });
                    }}
                    trackColor={{ false: isDark ? '#2f3638' : '#dae2fd', true: isDark ? '#6c5ce7' : '#002045' }}
                    thumbColor="#ffffff"
                  />
                </View>
                <Text className="font-label-lg text-on-surface dark:text-train-on-surface">{cat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Threshold */}
        <View>
          <Text className="mb-md font-label-lg uppercase tracking-wider text-primary dark:text-train-primary">
            Ajuste de Umbral
          </Text>
          <View className="space-y-sm">
            {([
              { key: 'critico' as const, label: 'Leer automáticamente solo alertas críticas' },
              { key: 'todo' as const,    label: 'Leer todas las permitidas' },
            ]).map((opt) => {
              const active = threshold === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setThreshold(opt.key);
                    scheduleSave({ autoReadMode: opt.key });
                  }}
                  className={`flex-row items-center justify-between rounded-xl border p-md ${
                    active
                      ? 'border-primary dark:border-train-primary bg-surface-container-high dark:bg-train-surface-container-high'
                      : 'border-outline-variant dark:border-train-outline-variant'
                  }`}
                  style={!active ? { backgroundColor: cardBg } : undefined}
                >
                  <Text className="flex-1 font-body-md text-on-surface dark:text-train-on-surface">{opt.label}</Text>
                  {active && <Icon name="check-circle" size={20} color={isDark ? '#c6bfff' : '#002045'} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Rules */}
        <Pressable
          onPress={() => setRulesModalOpen(true)}
          className="mt-xl flex-row items-center justify-between rounded-xl border border-outline-variant p-md dark:border-train-outline-variant"
          style={{ backgroundColor: cardBg }}
        >
          <View className="flex-row items-center gap-sm">
            <Icon name="format-list-bulleted" size={22} color={isDark ? '#c6bfff' : '#002045'} />
            <Text className="font-label-lg text-on-surface dark:text-train-on-surface">Reglas de Filtrado</Text>
          </View>
          <Icon name="chevron-right" size={22} color={isDark ? '#c8c4d7' : '#43474e'} />
        </Pressable>
      </ScrollView>

      <RulesModal
        visible={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        token={token}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}
