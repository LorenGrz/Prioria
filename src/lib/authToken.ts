import * as SecureStore from 'expo-secure-store';
import {
  AuthenticationDetails,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';

/**
 * All Cognito token plumbing lives here, not in AuthContext, so it can be
 * reused from a headless JS context (the background notification task,
 * src/tasks/notificationTask.ts) where there's no mounted React tree to
 * pull state/hooks from — just plain async functions over SecureStore.
 */

const USER_POOL_ID = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID    = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';

// expo-secure-store (iOS Keychain / Android Keystore) — not AsyncStorage.
// Auth tokens are more sensitive than app data and belong in encrypted
// storage; AsyncStorage on Android is plain-text SQLite.
export const TOKEN_KEY   = 'prioria_cognito_token';
export const EXPIRY_KEY  = 'prioria_cognito_expiry';
export const REFRESH_KEY = 'prioria_cognito_refresh';
export const EMAIL_KEY   = 'prioria_cognito_email';

// Refresh token is valid 30 days server-side (UserPoolClient config) —
// re-authenticate with SRP is only ever needed once per install/logout.
export const ACCESS_TOKEN_LIFETIME_MS = 55 * 60 * 1000; // access/id token is valid 1h server-side
export const REFRESH_LEAD_MS = 60_000; // refresh a little before actual expiry

const userPool = new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID });

export type SessionTokens = { idToken: string; refreshToken: string };

export function buildCognitoUser(email: string) {
  return new CognitoUser({ Username: email, Pool: userPool });
}

export function srpSignIn(email: string, password: string): Promise<SessionTokens> {
  return new Promise((resolve, reject) => {
    const user = buildCognitoUser(email);
    const details = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(details, {
      onSuccess: (result) =>
        resolve({
          idToken: result.getIdToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken(),
        }),
      onFailure: reject,
    });
  });
}

export function srpSignUp(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const attributeList = [new CognitoUserAttribute({ Name: 'email', Value: email })];
    userPool.signUp(email, password, attributeList, [], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function srpConfirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    buildCognitoUser(email).confirmRegistration(code, true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function srpResendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    buildCognitoUser(email).resendConfirmationCode((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function silentRefresh(email: string, refreshToken: string): Promise<SessionTokens> {
  return new Promise((resolve, reject) => {
    const user = buildCognitoUser(email);
    user.refreshSession(new CognitoRefreshToken({ RefreshToken: refreshToken }), (err, session) => {
      if (err || !session) {
        reject(err ?? new Error('No session returned'));
        return;
      }
      resolve({
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      });
    });
  });
}

export async function persistTokens(tokens: SessionTokens, email: string): Promise<void> {
  const expiry = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, tokens.idToken),
    SecureStore.setItemAsync(EXPIRY_KEY, String(expiry)),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    SecureStore.setItemAsync(EMAIL_KEY, email),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(EXPIRY_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(EMAIL_KEY),
  ]);
}

/**
 * Returns a valid access token, transparently refreshing via the stored
 * refresh token if the cached one is expired/near-expiry. Returns null if
 * there's no session to work with (never logged in, or refresh token is
 * itself dead) — callers just skip whatever needed auth.
 *
 * Deliberately has no side effect on React state — safe to call from the
 * headless notification task, which has no AuthContext/component tree.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const [token, expiry, email, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(EXPIRY_KEY),
    SecureStore.getItemAsync(EMAIL_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);

  if (token && expiry && Number(expiry) > Date.now() + REFRESH_LEAD_MS) {
    return token;
  }
  if (!email || !refreshToken) return null;

  try {
    const tokens = await silentRefresh(email, refreshToken);
    await persistTokens(tokens, email);
    return tokens.idToken;
  } catch {
    return null;
  }
}
