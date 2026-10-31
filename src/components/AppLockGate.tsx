import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors } from '@/theme';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';

/** Prompt for biometrics, falling back to the device passcode. */
export async function authenticate(reason = 'Unlock Ledger'): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, fallbackLabel: 'Use passcode' });
  return r.success;
}

/** True when this device can authenticate at all (hardware + something enrolled, biometric or passcode). */
export async function canAuthenticate(): Promise<boolean> {
  const [hw, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
  return hw && enrolled;
}

/**
 * Covers the app while locked. Locks on cold start and whenever the app goes to the
 * background, if "App lock" is on and someone is signed in.
 */
export function AppLockGate() {
  const enabled = useSettings((s) => s.appLock);
  const signedIn = useAuth((s) => !!s.user);
  const [locked, setLocked] = useState(true); // closed until settings are read, so nothing flashes
  const [hydrated, setHydrated] = useState(useSettings.persist.hasHydrated());
  const busy = useRef(false);
  const active = enabled && signedIn;

  useEffect(() => {
    if (hydrated) return;
    return useSettings.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  // Decide initial state once settings are known.
  useEffect(() => { if (hydrated) setLocked(active); }, [hydrated, active]);

  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', (s) => { if (s === 'background') setLocked(true); });
    return () => sub.remove();
  }, [active]);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try { if (await authenticate()) setLocked(false); } finally { busy.current = false; }
  }, []);

  useEffect(() => { if (hydrated && locked && active) unlock(); }, [hydrated, locked, active, unlock]);

  if (!hydrated || !locked || !active) return null;
  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="lock" size={34} color={colors.ink} />
      </View>
      <AppText variant="heading" color={colors.white}>Ledger is locked</AppText>
      <AppText variant="caption" color={colors.onInkMuted} style={{ textAlign: 'center' }}>Use Face ID, fingerprint or your device passcode.</AppText>
      <View style={{ alignSelf: 'stretch' }}><Button label="Unlock" height={56} onPress={unlock} style={{ backgroundColor: colors.mint }} /></View>
    </View>
  );
}
