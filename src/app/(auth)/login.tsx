import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from 'react-native-nitro-google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { isMockMode } from '@/lib/appMode';
import { useToast } from '@/components/ui/Toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (Platform.OS !== 'web') {
  GoogleOneTapSignIn.configure({
    webClientId: 'autoDetect',
    ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      ? { iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }
      : {}),
  });
}

function messageForAuthError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';
  if (code.includes('operation-not-allowed')) return 'Enable Email/Password and Google under Firebase Authentication sign-in providers.';
  if (code.includes('email-already-in-use')) return 'An account already uses this email. Sign in instead.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Email or password is incorrect.';
  if (code.includes('weak-password')) return 'Choose a password with at least 6 characters.';
  if (code.includes('invalid-email')) return 'Enter a valid email address.';
  if (code.includes('network-request-failed')) return 'Could not reach Firebase. Check your internet connection and try again.';
  if (error instanceof Error && error.message) return error.message;
  return 'Could not complete sign-in. Please try again.';
}

export default function Login() {
  const insets = useSafeAreaInsets();
  const signInWithMockUser = useAuth((state) => state.signInWithMockUser);
  const signIn = useAuth((state) => state.signIn);
  const createAccount = useAuth((state) => state.createAccount);
  const signInWithGoogleToken = useAuth((state) => state.signInWithGoogleToken);
  const resetPassword = useAuth((state) => state.resetPassword);
  const { showError } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const validEmail = EMAIL_RE.test(email.trim());
  const submit = async () => {
    setBusy(true);
    try {
      if (isMockMode) await signInWithMockUser(email);
      else if (creatingAccount) await createAccount(email, password);
      else await signIn(email, password);
    } catch (error) {
      showError(messageForAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    if (Platform.OS === 'web') {
      showError('Google sign-in is available in the iOS and Android app.');
      return;
    }
    setBusy(true);
    try {
      await GoogleOneTapSignIn.checkPlayServices();
      let result = await GoogleOneTapSignIn.signIn();
      if (isNoSavedCredentialFoundResponse(result)) result = await GoogleOneTapSignIn.createAccount();
      if (isNoSavedCredentialFoundResponse(result)) result = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (isCancelledResponse(result)) return;
      if (!isSuccessResponse(result) || !result.data.idToken) {
        throw new Error('Google sign-in did not return an ID token. Enable Google in Firebase Authentication and refresh google-services.json.');
      }
      await signInWithGoogleToken(result.data.idToken);
    } catch (error) {
      showError(messageForAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!validEmail) {
      showError('Enter your email address first to reset your password.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      showError('Password reset email sent. Check your inbox.');
    } catch (error) {
      showError(messageForAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1, paddingTop: insets.top + 56, paddingHorizontal: 20, gap: 18 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.incomeTint, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="credit-card" size={32} color={colors.primary} />
        </View>
        <AppText variant="display" color={colors.text} style={{ fontSize: 36, lineHeight: 40 }}>Know where{'\n'}your money goes.</AppText>
        <AppText color={colors.textSoft} style={{ fontFamily: font.regular, lineHeight: 22, maxWidth: 300 }}>
          Plan each month, log what you actually spend, and watch your balance grow.
        </AppText>
      </View>

      <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, borderTopWidth: 1, borderTopColor: colors.border, padding: 24, paddingBottom: Math.max(insets.bottom, 20) + 8, gap: 14 }}>
        <View>
          <AppText variant="heading" style={{ fontSize: 22 }}>{isMockMode ? 'Demo account' : creatingAccount ? 'Create your account' : 'Welcome back'}</AppText>
          <AppText variant="caption" color={colors.muted} style={{ marginTop: 4, fontSize: 14 }}>
            {isMockMode ? 'Your demo data stays on this device.' : 'Sign in securely with your Firebase account.'}
          </AppText>
        </View>

        <View style={{ height: 56, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1.5, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
          <Feather name="mail" size={20} color={colors.primary} />
          <TextInput
            accessibilityLabel="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.text }}
          />
        </View>

        {!isMockMode ? <View style={{ height: 56, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1.5, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
          <Feather name="lock" size={19} color={colors.primary} />
          <TextInput
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={creatingAccount ? 'new-password' : 'current-password'}
            textContentType={creatingAccount ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={() => { void submit(); }}
            style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.text }}
          />
        </View> : null}

        <Button
          label={isMockMode ? 'Continue with demo account' : creatingAccount ? 'Create account' : 'Sign in with email'}
          disabled={!validEmail || (!isMockMode && password.length < 6)}
          loading={busy}
          height={56}
          onPress={() => { void submit(); }}
          icon={<Feather name="arrow-right" size={18} color={colors.mint} />}
        />

        {!isMockMode ? <>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void continueWithGoogle(); }}
            style={{ minHeight: 52, borderRadius: 18, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <AppText color={colors.primary} style={{ fontFamily: font.extrabold, fontSize: 17 }}>G</AppText>
            <AppText style={{ fontFamily: font.bold, fontSize: 15 }}>Continue with Google</AppText>
          </Pressable>
          {!creatingAccount ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void sendPasswordReset(); }} style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
            <AppText color={colors.primary} style={{ fontFamily: font.semibold, fontSize: 14 }}>Forgot password?</AppText>
          </Pressable> : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setCreatingAccount((value) => !value)} style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center' }}>
            <AppText color={colors.muted} style={{ fontFamily: font.medium, fontSize: 14 }}>
              {creatingAccount ? 'Already registered? ' : 'New to Ledger? '}
              <AppText color={colors.primary} style={{ fontFamily: font.bold }}>{creatingAccount ? 'Sign in' : 'Create an account'}</AppText>
            </AppText>
          </Pressable>
        </> : <AppText variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>Demo mode: your data stays on this device.</AppText>}
      </View>
    </KeyboardAvoidingView>
  );
}
