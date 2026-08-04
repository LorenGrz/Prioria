import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopAppBar from '../components/TopAppBar';
import Icon from '../components/Icon';

type Urgency = 'critico' | 'aviso' | 'info';
type Feedback = 'up' | 'down' | null;

type HistoryItem = {
  id: string;
  urgency: Urgency;
  icon: React.ComponentProps<typeof Icon>['name'];
  time: string;
  title: string;
  body: string;
  status: 'Leída' | 'Ignorada';
};

const ITEMS: HistoryItem[] = [
  {
    id: '1',
    urgency: 'critico',
    icon: 'email-outline',
    time: '14:20',
    title: 'Correo de Gerencia',
    body: 'Se requiere aprobación inmediata para el despacho del convoy A-42 programado para las 16:00.',
    status: 'Leída',
  },
  {
    id: '2',
    urgency: 'aviso',
    icon: 'chat-outline',
    time: '13:45',
    title: 'WhatsApp: Logística',
    body: 'Cambio en la ruta de retorno por obras en la autopista central. Tomar desvío por sector norte.',
    status: 'Ignorada',
  },
  {
    id: '3',
    urgency: 'info',
    icon: 'calendar-outline',
    time: '11:10',
    title: 'Calendario: Reunión',
    body: 'Revisión semanal de equipos de seguridad en 30 minutos. Sala de conferencias B.',
    status: 'Leída',
  },
];

const URGENCY_STYLES: Record<Urgency, { border: string; label: string; labelColor: string }> = {
  critico: { border: 'border-l-4 border-l-error', label: 'Crítico', labelColor: 'text-error' },
  aviso: { border: 'border-l-4 border-l-orange-500', label: 'Aviso', labelColor: 'text-orange-600' },
  info: { border: 'border-l-4 border-l-primary', label: 'Info', labelColor: 'text-primary' },
};

const FILTERS = ['Todas', 'Urgentes', 'Leídas', 'Ignoradas'];

function HistoryCard({ item }: { item: HistoryItem }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [listening, setListening] = useState(false);
  const style = URGENCY_STYLES[item.urgency];

  return (
    <View className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm ${style.border}`}>
      <View className="mb-sm flex-row items-start justify-between">
        <View className="flex-row items-center gap-sm">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high">
            <Icon name={item.icon} size={20} color="#002045" />
          </View>
          <View>
            <View className="flex-row items-center gap-xs">
              <Text className={`text-[11px] font-bold uppercase tracking-wider ${style.labelColor}`}>
                {style.label}
              </Text>
              <Text className="text-[12px] text-on-surface-variant">• {item.time}</Text>
            </View>
            <Text className="font-label-lg text-on-surface">{item.title}</Text>
          </View>
        </View>
        <View
          className={`rounded px-xs py-0.5 ${item.status === 'Leída' ? 'bg-error-container' : 'bg-secondary-container'}`}
        >
          <Text
            className={`text-[10px] font-bold uppercase ${item.status === 'Leída' ? 'text-on-error-container' : 'text-on-secondary-container'}`}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <Text className="mb-md font-body-md leading-tight text-on-surface-variant">{item.body}</Text>

      <View className="flex-row items-center justify-between gap-md border-t border-outline-variant pt-sm">
        <Pressable
          onPress={() => setListening((v) => !v)}
          className="h-touch-target-min flex-row items-center gap-xs rounded-lg px-sm active:bg-primary-container/20"
        >
          <Icon name={listening ? 'pause-circle-outline' : 'play-circle-outline'} size={20} color="#002045" />
          <Text className="font-label-lg text-primary">{listening ? 'Pausar' : 'Escuchar'}</Text>
        </Pressable>
        <View className="flex-row gap-xs">
          <Pressable
            onPress={() => setFeedback((f) => (f === 'up' ? null : 'up'))}
            className={`h-10 w-10 items-center justify-center rounded-full border ${feedback === 'up' ? 'border-primary bg-primary-container' : 'border-outline'}`}
          >
            <Icon name="thumb-up-outline" size={18} color={feedback === 'up' ? '#86a0cd' : '#43474e'} />
          </Pressable>
          <Pressable
            onPress={() => setFeedback((f) => (f === 'down' ? null : 'down'))}
            className={`h-10 w-10 items-center justify-center rounded-full border ${feedback === 'down' ? 'border-error bg-error-container' : 'border-outline'}`}
          >
            <Icon name="thumb-down-outline" size={18} color={feedback === 'down' ? '#93000a' : '#43474e'} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('Todas');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <TopAppBar />
      <View className="px-margin-mobile pt-md">
        <Text className="mb-xs font-headline-lg-mobile text-primary">Historial de Alertas</Text>
        <Text className="mb-md font-body-md text-on-surface-variant">
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
                  active ? 'bg-primary' : 'border border-outline-variant bg-surface-container-low'
                }`}
              >
                <Text className={`font-label-lg ${active ? 'text-on-primary' : 'text-on-surface'}`}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="gap-md pb-xl">
        {ITEMS.map((item) => (
          <HistoryCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
