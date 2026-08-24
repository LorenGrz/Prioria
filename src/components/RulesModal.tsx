import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icon';
import { apiCall } from '../services/api';
import type { Rule } from '../types/rules';

type Props = {
  visible: boolean;
  onClose: () => void;
  token: string | null;
  isDark: boolean;
};

const SOURCE_LABEL: Record<Rule['source'], string> = {
  default: 'Regla por defecto',
  chat: 'Creada por chat',
  manual: 'Creada manualmente',
  'auto-archive': 'Aprendida automáticamente',
};

export default function RulesModal({ visible, onClose, token, isDark }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');

  useEffect(() => {
    if (!visible || !token) return;
    setStatus('loading');
    apiCall<{ items: Rule[] }>('/rules', 'GET', undefined, token)
      .then((res) => {
        setRules(res.items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [visible, token]);

  const cardBg      = isDark ? '#1a2123' : '#ffffff';
  const iconColor   = isDark ? '#c8c4d7' : '#43474e';
  const accentColor = isDark ? '#c6bfff' : '#002045';
  const errorColor  = '#ba1a1a';
  const trackFalse  = isDark ? '#2f3638' : '#dae2fd';
  const trackTrue   = isDark ? '#6c5ce7' : '#002045';

  async function toggleActive(rule: Rule) {
    if (!token) return;
    const nextActive = !rule.active;
    setRules((prev) => prev.map((r) => (r.ruleId === rule.ruleId ? { ...r, active: nextActive } : r)));
    try {
      await apiCall(`/rules/${rule.ruleId}`, 'PUT', { active: nextActive }, token);
    } catch {
      setRules((prev) => prev.map((r) => (r.ruleId === rule.ruleId ? { ...r, active: rule.active } : r)));
    }
  }

  async function saveEdit() {
    if (!token || !editingId) return;
    const ruleText = editingText.trim();
    if (!ruleText) return;
    const ruleId = editingId;
    setRules((prev) => prev.map((r) => (r.ruleId === ruleId ? { ...r, ruleText } : r)));
    setEditingId(null);
    try {
      await apiCall(`/rules/${ruleId}`, 'PUT', { ruleText }, token);
    } catch {
      // Best-effort: local edit stays visible until the next reload even if the PUT failed.
    }
  }

  async function confirmDelete(ruleId: string) {
    if (!token) return;
    setDeletingId(null);
    setRules((prev) => prev.filter((r) => r.ruleId !== ruleId));
    try {
      await apiCall(`/rules/${ruleId}`, 'DELETE', undefined, token);
    } catch {
      // Not re-inserting on failure — the next reload will resync from the backend.
    }
  }

  async function addRule() {
    if (!token) return;
    const ruleText = newRuleText.trim();
    if (!ruleText) return;
    try {
      const { rule } = await apiCall<{ rule: Rule }>('/rules', 'POST', { ruleText }, token);
      setRules((prev) => [...prev, rule]);
      setNewRuleText('');
      setAdding(false);
    } catch {
      // Leave the input open with the typed text so the user can retry.
    }
  }

  const defaults = rules.filter((r) => r.source === 'default');
  const others = rules.filter((r) => r.source !== 'default');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <SafeAreaView
          edges={['top', 'bottom']}
          className="mt-16 flex-1 rounded-t-2xl bg-background dark:bg-train-background"
        >
          <View className="flex-row items-center justify-between border-b border-outline-variant p-md dark:border-train-outline-variant">
            <Text className="font-headline-lg-mobile text-primary dark:text-train-primary">
              Reglas de Filtrado
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={24} color={iconColor} />
            </Pressable>
          </View>

          {status === 'loading' && (
            <View className="flex-1 items-center justify-center">
              <Text className="font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
                Cargando reglas...
              </Text>
            </View>
          )}

          {status === 'error' && (
            <View className="flex-1 items-center justify-center px-lg">
              <Text className="text-center font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
                No se pudieron cargar las reglas. Cerrá e intentá de nuevo.
              </Text>
            </View>
          )}

          {status === 'ready' && (
            <ScrollView className="flex-1 px-margin-mobile" contentContainerClassName="pb-lg pt-md">
              <RuleSection
                title="Reglas por defecto"
                rules={defaults}
                {...{ editingId, editingText, deletingId, cardBg, iconColor, accentColor, errorColor, trackFalse, trackTrue }}
                onToggleActive={toggleActive}
                onStartEdit={(r) => { setEditingId(r.ruleId); setEditingText(r.ruleText); }}
                onChangeEditingText={setEditingText}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingId(null)}
                onStartDelete={setDeletingId}
                onCancelDelete={() => setDeletingId(null)}
                onConfirmDelete={confirmDelete}
              />

              <RuleSection
                title="Reglas de entrenamiento"
                rules={others}
                {...{ editingId, editingText, deletingId, cardBg, iconColor, accentColor, errorColor, trackFalse, trackTrue }}
                onToggleActive={toggleActive}
                onStartEdit={(r) => { setEditingId(r.ruleId); setEditingText(r.ruleText); }}
                onChangeEditingText={setEditingText}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingId(null)}
                onStartDelete={setDeletingId}
                onCancelDelete={() => setDeletingId(null)}
                onConfirmDelete={confirmDelete}
              />

              {adding ? (
                <View
                  className="mt-sm flex-row items-center gap-sm rounded-xl border border-outline-variant p-sm dark:border-train-outline-variant"
                  style={{ backgroundColor: cardBg }}
                >
                  <TextInput
                    value={newRuleText}
                    onChangeText={setNewRuleText}
                    placeholder="Ej: las notificaciones de Instagram son críticas"
                    placeholderTextColor={iconColor}
                    autoFocus
                    multiline
                    className="flex-1 font-body-md text-on-surface dark:text-train-on-surface"
                  />
                  <Pressable onPress={addRule} hitSlop={8}>
                    <Icon name="check" size={22} color={accentColor} />
                  </Pressable>
                  <Pressable onPress={() => { setAdding(false); setNewRuleText(''); }} hitSlop={8}>
                    <Icon name="close" size={22} color={iconColor} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setAdding(true)}
                  className="mt-sm flex-row items-center justify-center gap-xs rounded-xl border border-dashed border-outline-variant p-md dark:border-train-outline-variant"
                >
                  <Icon name="plus" size={20} color={accentColor} />
                  <Text className="font-label-lg text-primary dark:text-train-primary">Agregar regla</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

type RowProps = {
  editingId: string | null;
  editingText: string;
  deletingId: string | null;
  cardBg: string;
  iconColor: string;
  accentColor: string;
  errorColor: string;
  trackFalse: string;
  trackTrue: string;
  onToggleActive: (rule: Rule) => void;
  onStartEdit: (rule: Rule) => void;
  onChangeEditingText: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartDelete: (ruleId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (ruleId: string) => void;
};

type SectionProps = RowProps & {
  title: string;
  rules: Rule[];
};

function RuleSection({ title, rules, ...row }: SectionProps) {
  if (rules.length === 0) return null;
  return (
    <View className="mb-lg">
      <Text className="mb-md font-label-lg uppercase tracking-wider text-primary dark:text-train-primary">
        {title}
      </Text>
      <View className="gap-sm">
        {rules.map((rule) => (
          <RuleRow key={rule.ruleId} rule={rule} {...row} />
        ))}
      </View>
    </View>
  );
}

function RuleRow({
  rule,
  editingId,
  editingText,
  deletingId,
  cardBg,
  iconColor,
  accentColor,
  errorColor,
  trackFalse,
  trackTrue,
  onToggleActive,
  onStartEdit,
  onChangeEditingText,
  onSaveEdit,
  onCancelEdit,
  onStartDelete,
  onCancelDelete,
  onConfirmDelete,
}: RowProps & { rule: Rule }) {
  const isEditing = editingId === rule.ruleId;
  const isDeleting = deletingId === rule.ruleId;

  return (
    <View
      className="rounded-xl border border-outline-variant p-md dark:border-train-outline-variant"
      style={{ backgroundColor: cardBg }}
    >
      {isEditing ? (
        <View className="flex-row items-start gap-sm">
          <TextInput
            value={editingText}
            onChangeText={onChangeEditingText}
            autoFocus
            multiline
            className="flex-1 font-body-md text-on-surface dark:text-train-on-surface"
          />
          <Pressable onPress={onSaveEdit} hitSlop={8}>
            <Icon name="check" size={20} color={accentColor} />
          </Pressable>
          <Pressable onPress={onCancelEdit} hitSlop={8}>
            <Icon name="close" size={20} color={iconColor} />
          </Pressable>
        </View>
      ) : (
        <>
          <View className="flex-row items-start justify-between">
            <Text className="mb-xs flex-1 pr-sm font-body-md text-on-surface dark:text-train-on-surface">
              {rule.ruleText}
            </Text>
            <Switch
              value={rule.active}
              onValueChange={() => onToggleActive(rule)}
              trackColor={{ false: trackFalse, true: trackTrue }}
              thumbColor="#ffffff"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-label-md text-on-surface-variant dark:text-train-on-surface-variant">
              {SOURCE_LABEL[rule.source]}
            </Text>
            {isDeleting ? (
              <View className="flex-row items-center gap-sm">
                <Text className="font-label-md" style={{ color: errorColor }}>¿Eliminar?</Text>
                <Pressable onPress={() => onConfirmDelete(rule.ruleId)} hitSlop={8}>
                  <Icon name="check" size={18} color={errorColor} />
                </Pressable>
                <Pressable onPress={onCancelDelete} hitSlop={8}>
                  <Icon name="close" size={18} color={iconColor} />
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center gap-md">
                <Pressable onPress={() => onStartEdit(rule)} hitSlop={8}>
                  <Icon name="pencil-outline" size={18} color={iconColor} />
                </Pressable>
                <Pressable onPress={() => onStartDelete(rule.ruleId)} hitSlop={8}>
                  <Icon name="trash-can-outline" size={18} color={iconColor} />
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}
