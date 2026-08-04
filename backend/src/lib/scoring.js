export function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Keep in sync with the thresholds used in process_notification.py. */
export function labelForScore(score) {
  if (score >= 75) return 'critica';
  if (score >= 45) return 'aviso';
  return 'info';
}
