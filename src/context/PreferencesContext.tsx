import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  updatePreferences,
  type Preferences,
} from '../lib/storage/preferences';

type PreferencesContextValue = {
  preferences: Preferences;
  ready: boolean;
  setPreferences: (patch: Partial<Preferences>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  ready: false,
  setPreferences: () => {},
});

const SAVE_DEBOUNCE_MS = 1500;

/**
 * Single source of truth for preferences, backed by AsyncStorage.
 * Replaces FiltersScreen/AjustesScreen each independently doing
 * GET/PUT /preferences with their own debounce timer — that duplication
 * was a latent race (two screens mounted at once could clobber each
 * other's in-flight PUT). One shared debounced writer here fixes it.
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferencesState] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<Preferences>>({});

  useEffect(() => {
    getPreferences().then((prefs) => {
      setPreferencesState(prefs);
      setReady(true);
    });
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const setPreferences = (patch: Partial<Preferences>) => {
    setPreferencesState((prev) => ({ ...prev, ...patch }));
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const patchToSave = pendingPatchRef.current;
      pendingPatchRef.current = {};
      updatePreferences(patchToSave).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  };

  return (
    <PreferencesContext.Provider value={{ preferences, ready, setPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
