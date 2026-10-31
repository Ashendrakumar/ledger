import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const insets = useSafeAreaInsets();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const valid = EMAIL_RE.test(email.trim());

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.ink }}>
      <View style={{ flex: 1, paddingTop: insets.top + 56, paddingHorizontal: 28, gap: 18 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="credit-card" size={32} color={colors.ink} />
        </View>
        <AppText variant="display" color={colors.white} style={{ fontSize: 36, lineHeight: 40 }}>Know where{'\n'}your money goes.</AppText>
        <AppText color={colors.onInkMuted} style={{ fontFamily: font.regular, lineHeight: 22, maxWidth: 300 }}>
          Plan each month, log what you actually spend, and watch your balance grow.
        </AppText>
      </View>

      <View style={{ backgroundColor: colors.white, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: 24, paddingBottom: Math.max(insets.bottom, 20) + 8, gap: 14 }}>
        <View>
          <AppText variant="heading" style={{ fontSize: 22 }}>{step === 'email' ? 'Welcome' : 'Check your email'}</AppText>
          <AppText variant="caption" color={colors.muted} style={{ marginTop: 4, fontSize: 14 }}>
            {step === 'email' ? 'Enter your email to sign in or create an account.' : `We sent a 6-digit code to ${email.trim()}.`}
          </AppText>
        </View>

        {step === 'email' ? (
          <>
            <View style={{ height: 56, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 2, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
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
            <Button label="Continue with email" disabled={!valid} height={56} onPress={() => setStep('code')}
              icon={<Feather name="arrow-right" size={18} color={colors.mint} />} />
            <AppText variant="caption" color={colors.muted}>We will email you a 6-digit code. No password to remember.</AppText>
          </>
        ) : (
          <>
            <TextInput
              accessibilityLabel="6-digit code"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              style={{ height: 56, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 2, borderColor: colors.primary, textAlign: 'center', letterSpacing: 8, fontFamily: font.extrabold, fontSize: 22, color: colors.text }}
            />
            {/* Prototype: any 6 digits are accepted. Wire to your backend here. */}
            <Button label="Verify and sign in" disabled={code.length !== 6} height={56} onPress={() => signIn(email.trim().toLowerCase())} />
            <Pressable accessibilityRole="button" onPress={() => { setStep('email'); setCode(''); }} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <AppText color={colors.primary} style={{ fontFamily: font.bold, fontSize: 14 }}>Use a different email</AppText>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
