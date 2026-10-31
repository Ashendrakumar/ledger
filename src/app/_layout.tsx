import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { colors } from '@/theme';
import { useAuth } from '@/store/auth';
import { AppLockGate } from '@/components/AppLockGate';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  const hydrated = useAuth((s) => s.hydrated);
  const signedIn = useAuth((s) => !!s.user);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="goals" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="goal-new" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="add" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="breakdown/[type]" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
          </Stack.Protected>
        </Stack>
        <AppLockGate />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
