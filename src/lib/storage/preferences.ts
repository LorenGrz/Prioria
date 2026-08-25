import AsyncStorage from '@react-native-async-storage/async-storage';

export type Preferences = {
  sensitivity: number; // 0-100, Filtros screen
  priorityThreshold: number; // 1-10, set during onboarding
  autoReadMode: 'critico' | 'todo';
  categories: Record<string, boolean>;
  voice: {
    voiceId: 'lucia' | 'enrique';
    language: string;
    speed: number; // 0.5 - 2.0
  };
};

export const DEFAULT_PREFERENCES: Preferences = {
  sensitivity: 85,
  priorityThreshold: 8,
  autoReadMode: 'critico',
  categories: {
    bancos: true,
    pagos: true,
    trabajo: true,
    seguridad: true,
    clientes: false,
    entregas: true,
  },
  voice: {
    voiceId: 'lucia',
    language: 'es-ES',
    speed: 1.0,
  },
};

const STORAGE_KEY = 'prioria_preferences';

export async function getPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function updatePreferences(patch: Partial<Preferences>): Promise<Preferences> {
  const current = await getPreferences();
  const merged = { ...current, ...patch };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}
