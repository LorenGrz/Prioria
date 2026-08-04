import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

type Message = {
  id: string;
  from: 'ai' | 'user';
  text: string;
  time?: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    from: 'ai',
    text: '¡Hola! Dime qué tipo de notificaciones te gustaría priorizar o silenciar.',
  },
  {
    id: '2',
    from: 'user',
    text: 'Solo avísame de transferencias superiores a $50k',
    time: '10:42 AM',
  },
  {
    id: '3',
    from: 'ai',
    text: 'Entendido. He actualizado tus reglas de filtrado. A partir de ahora, las notificaciones de transferencias por debajo de $50,000 serán silenciadas y agrupadas en tu resumen diario, mientras que las que superen ese monto serán marcadas como Críticas.',
  },
];

export default function TrainScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      from: 'user',
      text,
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };
    setDraft('');
    setMessages((prev) => [...prev, userMsg]);
    // Placeholder ack — real reply comes from the Strands/Bedrock agent via the backend.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai`,
          from: 'ai',
          text: 'Regla recibida. La aplicaré a tus próximas notificaciones y ajustaré tu resumen diario en consecuencia.',
        },
      ]);
    }, 600);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-train-background">
      {/* Top App Bar (dark) */}
      <View className="h-[72px] w-full flex-row items-center justify-between border-b border-train-surface-container-high bg-train-background px-train-margin-mobile">
        <View className="flex-row items-center gap-train-unit">
          <Icon name="shield-check" size={22} color="#c6bfff" />
          <Text className="font-train-display-lg text-[24px] leading-none text-train-primary-container">
            Prioria
          </Text>
        </View>
        <Icon name="dots-vertical" size={22} color="#c8c4d7" />
      </View>

      <View className="items-center px-train-margin-mobile pt-train-stack-md">
        <Text className="font-train-headline-lg-mobile text-train-on-surface">
          Chat de Entrenamiento IA
        </Text>
        <Text className="mt-train-stack-sm text-center font-train-body-sm text-train-on-surface-variant">
          Entrena a tu asistente explicando qué notificaciones son críticas para ti.
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerClassName="gap-train-stack-md px-train-margin-mobile py-train-stack-md"
          renderItem={({ item }) =>
            item.from === 'ai' ? (
              <View className="max-w-[85%] flex-row items-start gap-train-unit">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-train-surface-container-high">
                  <Icon name="brain" size={16} color="#c6bfff" />
                </View>
                <View className="flex-1 rounded-2xl rounded-tl-none border border-train-surface-container-high bg-train-surface-container p-train-margin-mobile">
                  <Text className="font-train-body-sm text-train-on-surface">{item.text}</Text>
                </View>
              </View>
            ) : (
              <View className="items-end gap-1">
                <View className="max-w-[85%] rounded-2xl rounded-tr-none bg-train-primary-container p-train-margin-mobile">
                  <Text className="font-train-body-sm text-train-on-primary-container">{item.text}</Text>
                </View>
                {item.time && (
                  <Text className="mr-1 text-[10px] text-train-on-surface-variant">{item.time}</Text>
                )}
              </View>
            )
          }
        />

        {/* Input */}
        <View className="border-t border-train-surface-container-high bg-train-background/95 px-train-margin-mobile pb-train-margin-mobile pt-train-stack-sm">
          <View className="flex-row items-center gap-train-unit rounded-full border border-train-surface-container-high bg-train-surface-container-low py-1 pl-4 pr-1">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe una regla para tu asistente..."
              placeholderTextColor="#c8c4d7"
              className="flex-1 font-train-body-sm text-train-on-surface"
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable
              onPress={handleSend}
              className="h-10 w-10 items-center justify-center rounded-full bg-train-primary-container active:opacity-90"
            >
              <Icon name="send" size={18} color="#faf6ff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
