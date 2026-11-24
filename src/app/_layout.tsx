import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Appearance } from 'react-native';
import {
  useFonts,
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { colors } from '@/theme';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { AppLockGate } from '@/components/AppLockGate';
import { initEmiReminderSync } from '@/lib/reminders';
import { initBudgetAlertSync } from '@/lib/budgetAlerts';
import { flushOnboarding } from '@/lib/onboardingQueue';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  const hydrated = useAuth((s) => s.hydrated);
  const sessionChecked = useAuth((s) => s.sessionChecked);
  const restoreSession = useAuth((s) => s.restoreSession);
  const userId = useAuth((s) => s.user?.id);
  const signedIn = useAuth((s) => !!s.user);
  const setupComplete = useAuth((s) => s.setupComplete);
  const ready = fontsLoaded && hydrated && sessionChecked;
  // Re-render the tree when the theme mode or the system color scheme changes —
  // `colors` in `@/theme` re-reads the current palette on every render.
  const [, setTick] = useState(0);

  useEffect(() => {
    const t1 = useSettings.subscribe(() => setTick((t) => t + 1));
    const t2 = Appearance.addChangeListener(() => setTick((t) => t + 1));
    return () => { t1(); t2.remove(); };
  }, []);

  useEffect(() => {
    if (hydrated) void restoreSession();
  }, [hydrated, restoreSession]);

  useEffect(() => {
    if (sessionChecked && userId) void flushOnboarding(userId);
  }, [sessionChecked, userId]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // EMI reminder scheduling + tap handling. No-ops in Expo Go / without permission.
  useEffect(() => initEmiReminderSync(), []);
  useEffect(() => initBudgetAlertSync(), []);

  if (!ready) return null;

  // transparentModal routes must be transparent so the page behind stays visible —
  // the global contentStyle (canvas) would otherwise paint a gray backdrop behind the sheet.
  const modalOpts = { presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } } as const;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Protected guard={!setupComplete}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected guard={setupComplete}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="goals" />
            <Stack.Screen name="loans" />
            <Stack.Screen name="loan-new" options={modalOpts} />
            <Stack.Screen name="loan-prepay" options={modalOpts} />
            <Stack.Screen name="loan/[id]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="goal-new" options={modalOpts} />
            <Stack.Screen name="add" options={modalOpts} />
            <Stack.Screen name="breakdown/[type]" options={modalOpts} />
            </Stack.Protected>
          </Stack.Protected>
        </Stack>
        <AppLockGate />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
