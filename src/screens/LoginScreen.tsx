import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Mode = 'login' | 'signup' | 'confirm';

// Mirrors the Cognito User Pool's PasswordPolicy (backend/template.yaml) so
// the user gets immediate feedback instead of a round-trip rejection.
function passwordIssue(pw: string): string | null {
  if (pw.length < 12) return 'Debe tener al menos 12 caracteres.';
  if (!/[a-z]/.test(pw)) return 'Debe incluir una minúscula.';
  if (!/[A-Z]/.test(pw)) return 'Debe incluir una mayúscula.';
  if (!/[0-9]/.test(pw)) return 'Debe incluir un número.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Debe incluir un símbolo (ej: ! ? # -).';
  return null;
}

export default function LoginScreen() {
  const { signIn, signUp, confirmSignUp, resendConfirmationCode } = useAuth();
  const { isDark } = useTheme();
  const iconColor = isDark ? '#c8c4d7' : '#43474e';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const clearMessages = () => { if (error) setError(null); if (info) setInfo(null); };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword('');
    setConfirmPassword('');
  };

  const canSubmitLogin = email.trim().length > 0 && password.length > 0 && !submitting;
  const canSubmitSignup =
    email.trim().length > 0 && password.length > 0 && confirmPassword.length > 0 && !submitting;
  const canSubmitConfirm = code.trim().length > 0 && !submitting;

  const handleLogin = async () => {
    if (!canSubmitLogin) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // Deliberately generic — Cognito's PreventUserExistenceErrors already
      // keeps "wrong email" vs "wrong password" indistinguishable server-side;
      // don't undo that by surfacing the raw SDK error message.
      setError('Email o contraseña incorrectos. Intentá de nuevo.');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async () => {
    if (!canSubmitSignup) return;
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    const issue = passwordIssue(password);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email, password);
      setInfo(`Te mandamos un código a ${email.trim()}. Ingresalo abajo para activar tu cuenta.`);
      setMode('confirm');
    } catch (err: any) {
      setError(
        err?.name === 'UsernameExistsException'
          ? 'Ya existe una cuenta con ese email.'
          : 'No pudimos crear la cuenta. Revisá el email e intentá de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!canSubmitConfirm) return;
    setError(null);
    setSubmitting(true);
    try {
      await confirmSignUp(email, code);
      // Auto-login right after confirming — we already have the password in state.
      await signIn(email, password);
    } catch {
      setError('Código incorrecto o vencido. Probá de nuevo o pedí uno nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    try {
      await resendConfirmationCode(email);
      setInfo('Te mandamos un código nuevo.');
    } catch {
      setError('No pudimos reenviar el código. Intentá de nuevo en un momento.');
    }
  };

  const inputWrapClass =
    'flex-row items-center gap-sm rounded-xl border border-outline-variant dark:border-train-outline-variant bg-surface-container-low dark:bg-train-surface-container-low px-md';
  const inputClass = 'h-touch-target-min flex-1 font-body-md text-on-surface dark:text-train-on-surface';

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background dark:bg-train-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-margin-mobile">
          <View className="mb-2xl items-center">
            <View className="mb-lg h-20 w-20 items-center justify-center rounded-full bg-primary-container dark:bg-train-primary-container">
              <Icon name={mode === 'confirm' ? 'email-check-outline' : 'shield-lock'} size={40} color={isDark ? '#faf6ff' : '#86a0cd'} />
            </View>
            <Text className="mb-xs font-headline-lg text-primary dark:text-train-primary">
              Prioria
            </Text>
            <Text className="text-center font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
              {mode === 'login' && 'Iniciá sesión para seguir priorizando tus notificaciones.'}
              {mode === 'signup' && 'Creá tu cuenta para empezar.'}
              {mode === 'confirm' && 'Confirmá tu email para activar la cuenta.'}
            </Text>
          </View>

          {mode !== 'confirm' && (
            <View className="mb-lg flex-row rounded-xl border border-outline-variant dark:border-train-outline-variant p-1">
              <Pressable
                onPress={() => switchMode('login')}
                className={`flex-1 items-center rounded-lg py-sm ${mode === 'login' ? 'bg-primary' : ''}`}
              >
                <Text className={`font-label-lg ${mode === 'login' ? 'text-on-primary' : 'text-on-surface-variant dark:text-train-on-surface-variant'}`}>
                  Iniciar sesión
                </Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode('signup')}
                className={`flex-1 items-center rounded-lg py-sm ${mode === 'signup' ? 'bg-primary' : ''}`}
              >
                <Text className={`font-label-lg ${mode === 'signup' ? 'text-on-primary' : 'text-on-surface-variant dark:text-train-on-surface-variant'}`}>
                  Crear cuenta
                </Text>
              </Pressable>
            </View>
          )}

          <View className="gap-md">
            {mode !== 'confirm' && (
              <View className={inputWrapClass}>
                <Icon name="email-outline" size={20} color={iconColor} />
                <TextInput
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearMessages(); }}
                  placeholder="Email"
                  placeholderTextColor={iconColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  keyboardType="email-address"
                  inputMode="email"
                  editable={!submitting}
                  className={inputClass}
                />
              </View>
            )}

            {mode === 'confirm' && (
              <Text className="px-xs font-body-md text-on-surface-variant dark:text-train-on-surface-variant">
                {email}
              </Text>
            )}

            {mode !== 'confirm' && (
              <View className={inputWrapClass}>
                <Icon name="lock-outline" size={20} color={iconColor} />
                <TextInput
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearMessages(); }}
                  placeholder="Contraseña"
                  placeholderTextColor={iconColor}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === 'signup' ? 'new-password' : 'password'}
                  textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                  editable={!submitting}
                  onSubmitEditing={mode === 'login' ? handleLogin : undefined}
                  returnKeyType={mode === 'login' ? 'go' : 'next'}
                  className={inputClass}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={iconColor} />
                </Pressable>
              </View>
            )}

            {mode === 'signup' && (
              <View className={inputWrapClass}>
                <Icon name="lock-check-outline" size={20} color={iconColor} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); clearMessages(); }}
                  placeholder="Repetir contraseña"
                  placeholderTextColor={iconColor}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  editable={!submitting}
                  onSubmitEditing={handleSignup}
                  returnKeyType="go"
                  className={inputClass}
                />
              </View>
            )}

            {mode === 'signup' && (
              <Text className="px-xs font-label-md text-on-surface-variant dark:text-train-on-surface-variant">
                Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
              </Text>
            )}

            {mode === 'confirm' && (
              <View className={inputWrapClass}>
                <Icon name="numeric" size={20} color={iconColor} />
                <TextInput
                  value={code}
                  onChangeText={(v) => { setCode(v); clearMessages(); }}
                  placeholder="Código de verificación"
                  placeholderTextColor={iconColor}
                  keyboardType="number-pad"
                  editable={!submitting}
                  onSubmitEditing={handleConfirm}
                  returnKeyType="go"
                  className={inputClass}
                />
              </View>
            )}

            {error && (
              <View className="flex-row items-center gap-xs px-xs">
                <Icon name="alert-circle-outline" size={16} color="#ba1a1a" />
                <Text className="flex-1 font-label-md" style={{ color: '#ba1a1a' }}>{error}</Text>
              </View>
            )}
            {info && !error && (
              <View className="flex-row items-center gap-xs px-xs">
                <Icon name="information-outline" size={16} color={isDark ? '#c6bfff' : '#002045'} />
                <Text className="flex-1 font-label-md text-primary dark:text-train-primary">{info}</Text>
              </View>
            )}

            <Pressable
              onPress={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleConfirm}
              disabled={mode === 'login' ? !canSubmitLogin : mode === 'signup' ? !canSubmitSignup : !canSubmitConfirm}
              className={`mt-sm h-touch-target-min flex-row items-center justify-center gap-sm rounded-xl shadow-md active:opacity-90 ${
                (mode === 'login' ? canSubmitLogin : mode === 'signup' ? canSubmitSignup : canSubmitConfirm)
                  ? 'bg-primary'
                  : 'bg-surface-container-high dark:bg-train-surface-container-high'
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Icon name={mode === 'confirm' ? 'check-decagram-outline' : 'login'} size={20} color="#ffffff" />
                  <Text className="font-label-lg text-on-primary">
                    {mode === 'login' && 'Ingresar'}
                    {mode === 'signup' && 'Crear cuenta'}
                    {mode === 'confirm' && 'Confirmar'}
                  </Text>
                </>
              )}
            </Pressable>

            {mode === 'confirm' && (
              <Pressable onPress={handleResend} className="items-center py-sm">
                <Text className="font-label-lg text-primary dark:text-train-primary">Reenviar código</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
