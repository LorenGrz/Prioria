/**
 * Local-only id generator — no crypto.randomUUID() polyfill is installed
 * in this project, and nothing here needs cryptographic uniqueness, just
 * "unique enough for a single device's local list".
 */
export function generateLocalId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
