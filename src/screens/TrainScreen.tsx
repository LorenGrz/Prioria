import { useRef, useState } from 'react';
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
import * as Speech from 'expo-speech';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';

type Message = {
  id: string;
  from: 'ai' | 'user';
  text: string;
  time?: string;
};

const GREETING: Message = {
  id: 'greeting',
  from: 'ai',
  text: '¡Hola! Dime qué tipo de notificaciones te gustaría priorizar o silenciar.',
};

export default function TrainScreen() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const { token } = useAuth();

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      from: 'user',
      text,
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };
    setDraft('');
    setSending(true);
    setMessages((prev) => [...prev, userMsg]);
    scrollToEnd();

    try {
      const data = await apiCall<{ reply: string }>('/train', 'POST', { message: text }, token);
      const aiText = data.reply ?? 'Regla guardada.';
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-ai`, from: 'ai', text: aiText },
      ]);
      Speech.speak(aiText, { language: 'es-ES', rate: 1.0 });
    } catch {
      const errText = 'No pude conectarme al asistente. Revisá tu conexión.';
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-ai`, from: 'ai', text: errText },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-background dark:bg-train-background">
      <View className="items-center px-margin-mobile pt-md">
        <Text className="font-headline-lg-mobile text-on-surface dark:text-train-on-surface">
          Chat de Entrenamiento IA
        </Text>
        <Text className="mt-sm text-center font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
          Entrena a tu asistente explicando qué notificaciones son críticas para ti.
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-md px-margin-mobile py-md"
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) =>
            item.from === 'ai' ? (
              <View className="max-w-[85%] flex-row items-start gap-sm">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-container dark:bg-train-surface-container-high">
                  <Icon name="brain" size={16} color="#86a0cd" />
                </View>
                <View className="flex-1 rounded-2xl rounded-tl-none border border-outline-variant dark:border-train-surface-container-high bg-surface-container-low dark:bg-train-surface-container p-md">
                  <Text className="font-body-md text-on-surface dark:text-train-on-surface">{item.text}</Text>
                </View>
              </View>
            ) : (
              <View className="items-end gap-1">
                <View className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary-container dark:bg-train-primary-container p-md">
                  <Text className="font-body-md text-on-primary-container dark:text-train-on-primary-container">{item.text}</Text>
                </View>
                {item.time && (
                  <Text className="mr-1 text-[10px] text-on-surface-variant dark:text-train-on-surface-variant">{item.time}</Text>
                )}
              </View>
            )
          }
        />

        {/* Input */}
        <View className="border-t border-outline-variant dark:border-train-outline-variant bg-background dark:bg-train-background px-margin-mobile pb-md pt-sm">
          <View className="flex-row items-center gap-sm rounded-full border border-outline-variant dark:border-train-outline-variant bg-surface-container-low dark:bg-train-surface-container-low py-1 pl-4 pr-1">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe una regla para tu asistente..."
              placeholderTextColor="#74777f"
              className="flex-1 font-body-md text-on-surface dark:text-train-on-surface"
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!sending}
            />
            <Pressable
              onPress={handleSend}
              disabled={sending || !draft.trim()}
              className={`h-10 w-10 items-center justify-center rounded-full active:opacity-90 ${
                sending || !draft.trim()
                  ? 'bg-surface-container dark:bg-train-surface-container-high'
                  : 'bg-primary-container dark:bg-train-primary-container'
              }`}
            >
              <Icon name={sending ? 'dots-horizontal' : 'send'} size={18} color="#faf6ff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
