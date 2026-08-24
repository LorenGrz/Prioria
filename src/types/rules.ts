export type RuleSource = 'default' | 'chat' | 'manual' | 'auto-archive';

export type Rule = {
  userId: string;
  ruleId: string;
  ruleText: string;
  source: RuleSource;
  active: boolean;
  sourceMessage?: string;
  createdAt: string;
  updatedAt?: string;
};
