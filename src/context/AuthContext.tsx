import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  ACCESS_TOKEN_LIFETIME_MS,
  EMAIL_KEY,
  EXPIRY_KEY,
  REFRESH_KEY,
  REFRESH_LEAD_MS,
  TOKEN_KEY,
  clearTokens,
  persistTokens,
  silentRefresh,
  srpConfirmSignUp,
  srpResendConfirmationCode,
  srpSignIn,
  srpSignUp,
  type SessionTokens,
} from '../lib/authToken';

export type AuthStatus = 'checking' | 'needsLogin' | 'authenticated';

type AuthContextValue = {
  token: string | null;
  status: AuthStatus;
  isAuthReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  token: null,
  status: 'checking',
  isAuthReady: false,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
  confirmSignUp: async () => {},
  resendConfirmationCode: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = (ms: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => attemptSilentRefresh(), Math.max(ms, 0));
  };

  const applySession = async (tokens: SessionTokens, email: string) => {
    await persistTokens(tokens, email);
    setToken(tokens.idToken);
    setStatus('authenticated');
    scheduleRefresh(ACCESS_TOKEN_LIFETIME_MS - REFRESH_LEAD_MS);
  };

  const clearSession = async () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    await clearTokens();
    setToken(null);
    setStatus('needsLogin');
  };

  // Backstop for the timer above: Android can suspend JS timers while the
  // app is backgrounded for a long time, so re-check on every foreground
  // transition too instead of trusting the timer alone.
  const attemptSilentRefresh = async () => {
    const [email, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(EMAIL_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    if (!email || !refreshToken) {
      setStatus('needsLogin');
      return;
    }
    try {
      const tokens = await silentRefresh(email, refreshToken);
      await applySession(tokens, email);
    } catch (err) {
      // Refresh token expired (30 days) or was revoked — only real recovery is a fresh login.
      console.warn('[AuthContext] silent refresh failed:', err);
      await clearSession();
    }
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim();
    const tokens = await srpSignIn(normalizedEmail, password);
    await applySession(tokens, normalizedEmail);
  };

  const signOut = async () => {
    await clearSession();
  };

  const signUp = async (email: string, password: string) => {
    await srpSignUp(email.trim(), password);
  };

  const confirmSignUp = async (email: string, code: string) => {
    await srpConfirmSignUp(email.trim(), code.trim());
  };

  const resendConfirmationCode = async (email: string) => {
    await srpResendConfirmationCode(email.trim());
  };

  useEffect(() => {
    (async () => {
      const [storedToken, storedExpiry, storedRefresh, storedEmail] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(EXPIRY_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
        SecureStore.getItemAsync(EMAIL_KEY),
      ]);

      if (storedToken && storedExpiry && Number(storedExpiry) > Date.now() + REFRESH_LEAD_MS) {
        setToken(storedToken);
        setStatus('authenticated');
        scheduleRefresh(Number(storedExpiry) - Date.now() - REFRESH_LEAD_MS);
      } else if (storedRefresh && storedEmail) {
        await attemptSilentRefresh();
      } else {
        setStatus('needsLogin');
      }
    })();

    const onAppStateChange = async (state: AppStateStatus) => {
      if (state !== 'active') return;
      const storedExpiry = await SecureStore.getItemAsync(EXPIRY_KEY);
      if (!storedExpiry || Number(storedExpiry) <= Date.now() + REFRESH_LEAD_MS) {
        await attemptSilentRefresh();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      subscription.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        status,
        isAuthReady: status !== 'checking',
        signIn,
        signOut,
        signUp,
        confirmSignUp,
        resendConfirmationCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
