/**
 * Starter rules seeded once per user (see rules/list.js) so a new "Reglas
 * de Filtrado" list isn't empty on first open. Plain baseline heuristics
 * aligned with FiltersScreen's category list — fully editable/deletable
 * like any other rule once seeded.
 */
export const DEFAULT_RULES = [
  'Las notificaciones de bancos y pagos son críticas por defecto: hay dinero en juego.',
  'Las notificaciones de trabajo y clientes son avisos, no interrumpen, salvo que mencionen una urgencia explícita o un deadline inmediato.',
  'Las notificaciones de seguridad son críticas por defecto.',
  'Las notificaciones de entregas son informativas salvo que indiquen un problema o retraso.',
];
