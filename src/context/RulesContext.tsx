import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  getAllRules,
  addRule as addRuleStorage,
  updateRule as updateRuleStorage,
  removeRule as removeRuleStorage,
  type Rule,
  type RuleSource,
} from '../lib/storage/rules';

type RulesContextValue = {
  rules: Rule[];
  ready: boolean;
  addRule: (ruleText: string, source: RuleSource, sourceMessage?: string) => Promise<Rule>;
  updateRule: (ruleId: string, patch: { ruleText?: string; active?: boolean }) => Promise<void>;
  removeRule: (ruleId: string) => Promise<void>;
  activeRuleTexts: () => string[];
};

const RulesContext = createContext<RulesContextValue>({
  rules: [],
  ready: false,
  addRule: async () => {
    throw new Error('RulesProvider not mounted');
  },
  updateRule: async () => {},
  removeRule: async () => {},
  activeRuleTexts: () => [],
});

/** Single source of truth for rules (chat-taught + manual + default), backed by AsyncStorage. */
export function RulesProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [ready, setReady] = useState(false);
  const rulesRef = useRef<Rule[]>([]);
  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

  useEffect(() => {
    getAllRules().then((r) => {
      setRules(r);
      setReady(true);
    });
  }, []);

  const addRule = async (ruleText: string, source: RuleSource, sourceMessage?: string) => {
    const rule = await addRuleStorage(ruleText, source, sourceMessage);
    setRules((prev) => [...prev, rule]);
    return rule;
  };

  const updateRule = async (ruleId: string, patch: { ruleText?: string; active?: boolean }) => {
    const updated = await updateRuleStorage(ruleId, patch);
    if (updated) setRules((prev) => prev.map((r) => (r.ruleId === ruleId ? updated! : r)));
  };

  const removeRule = async (ruleId: string) => {
    await removeRuleStorage(ruleId);
    setRules((prev) => prev.filter((r) => r.ruleId !== ruleId));
  };

  // Function (not derived state) so classify.ts always reads the latest
  // list even from a callback captured before a rule was added/toggled.
  const activeRuleTexts = () => rulesRef.current.filter((r) => r.active).map((r) => r.ruleText);

  return (
    <RulesContext.Provider value={{ rules, ready, addRule, updateRule, removeRule, activeRuleTexts }}>
      {children}
    </RulesContext.Provider>
  );
}

export function useRules() {
  return useContext(RulesContext);
}
