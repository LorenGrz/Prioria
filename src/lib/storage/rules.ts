import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateLocalId } from '../localId';
import { DEFAULT_RULES } from '../defaultRules';

export type RuleSource = 'default' | 'chat' | 'manual';

export type Rule = {
  ruleId: string;
  ruleText: string;
  source: RuleSource;
  active: boolean;
  sourceMessage?: string;
  createdAt: string;
  updatedAt?: string;
};

const STORAGE_KEY = 'prioria_rules';

/** Returns null only when storage has never been written (first-ever read). */
async function readAll(): Promise<Rule[] | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rules: Rule[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

function seedDefaults(): Rule[] {
  const now = new Date().toISOString();
  return DEFAULT_RULES.map((ruleText) => ({
    ruleId: generateLocalId(),
    ruleText,
    source: 'default' as const,
    active: true,
    createdAt: now,
  }));
}

/** Seeds DEFAULT_RULES on first-ever read (empty storage), then returns the full list. */
export async function getAllRules(): Promise<Rule[]> {
  const existing = await readAll();
  if (existing !== null) return existing;
  const seeded = seedDefaults();
  await writeAll(seeded);
  return seeded;
}

export async function addRule(
  ruleText: string,
  source: RuleSource,
  sourceMessage?: string
): Promise<Rule> {
  const rules = await getAllRules();
  const rule: Rule = {
    ruleId: generateLocalId(),
    ruleText,
    source,
    active: true,
    ...(sourceMessage ? { sourceMessage } : {}),
    createdAt: new Date().toISOString(),
  };
  await writeAll([...rules, rule]);
  return rule;
}

export async function updateRule(
  ruleId: string,
  patch: { ruleText?: string; active?: boolean }
): Promise<Rule | null> {
  const rules = await getAllRules();
  let updated: Rule | null = null;
  const next = rules.map((r) => {
    if (r.ruleId !== ruleId) return r;
    updated = { ...r, ...patch, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (updated) await writeAll(next);
  return updated;
}

export async function removeRule(ruleId: string): Promise<void> {
  const rules = await getAllRules();
  await writeAll(rules.filter((r) => r.ruleId !== ruleId));
}

/** Rule text of every currently-active rule — what classify.ts sends as `activeRules`. */
export async function getActiveRuleTexts(): Promise<string[]> {
  const rules = await getAllRules();
  return rules.filter((r) => r.active).map((r) => r.ruleText);
}
