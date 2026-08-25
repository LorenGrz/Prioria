export type PriorityLabel = 'critica' | 'aviso' | 'info';

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function labelForScore(score: number): PriorityLabel {
  if (score >= 75) return 'critica';
  if (score >= 45) return 'aviso';
  return 'info';
}
