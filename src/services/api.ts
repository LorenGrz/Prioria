const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export async function apiCall<T = unknown>(
  path: string,
  method: string = 'GET',
  body?: unknown,
  token?: string | null,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[API] ${method} ${path} → ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}
