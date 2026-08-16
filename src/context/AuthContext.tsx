import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';

const USER_POOL_ID = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID    = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';
const USERNAME     = process.env.EXPO_PUBLIC_COGNITO_USERNAME ?? '';
const PASSWORD     = process.env.EXPO_PUBLIC_COGNITO_PASSWORD ?? '';

const TOKEN_KEY    = 'prioria_cognito_token';
const EXPIRY_KEY   = 'prioria_cognito_expiry';

const userPool = new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID });

type AuthContextValue = {
  token: string | null;
  isAuthReady: boolean;
};

const AuthContext = createContext<AuthContextValue>({ token: null, isAuthReady: false });

function signIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: USERNAME, Pool: userPool });
    const details = new AuthenticationDetails({ Username: USERNAME, Password: PASSWORD });
    user.authenticateUser(details, {
      onSuccess: (result) => resolve(result.getIdToken().getJwtToken()),
      onFailure: reject,
    });
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSignIn = async () => {
    try {
      const jwt = await signIn();
      const expiry = Date.now() + 55 * 60 * 1000; // 55 min (token valid for 1h)
      await AsyncStorage.multiSet([[TOKEN_KEY, jwt], [EXPIRY_KEY, String(expiry)]]);
      NativeModules.NotificationModule?.saveAuthToken?.(jwt);
      setToken(jwt);
      // Auto-refresh before expiry
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(doSignIn, 50 * 60 * 1000);
    } catch (err) {
      console.warn('[AuthContext] sign-in failed:', err);
      setToken(null);
    } finally {
      setIsAuthReady(true);
    }
  };

  useEffect(() => {
    (async () => {
      const [[, storedToken], [, storedExpiry]] = await AsyncStorage.multiGet([TOKEN_KEY, EXPIRY_KEY]);
      if (storedToken && storedExpiry && Number(storedExpiry) > Date.now() + 60_000) {
        setToken(storedToken);
        setIsAuthReady(true);
        const msLeft = Number(storedExpiry) - Date.now() - 60_000;
        refreshTimer.current = setTimeout(doSignIn, msLeft);
      } else {
        await doSignIn();
      }
    })();
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
