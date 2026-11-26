import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Notifications } from '@/lib/notifications';
import { setAccessToken } from '@/lib/api';
import { clearRefreshToken } from '@/lib/authTokens';
import { monthKey } from '@/lib/dates';
import { useEntries } from '@/store/entries';
import { useGoals } from '@/store/goals';
import { useLoans } from '@/store/loans';
import { useSettings } from '@/store/settings';
import { useUi } from '@/store/ui';

export async function resetMockAppData() {
  if (!__DEV__) throw new Error('Mock data reset is only available in development.');

  await Promise.all([
    useEntries.persist.rehydrate(),
    useGoals.persist.rehydrate(),
    useLoans.persist.rehydrate(),
    useSettings.persist.rehydrate(),
  ]);

  if (Platform.OS !== 'web') {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  }

  await clearRefreshToken();
  setAccessToken(null);
  await AsyncStorage.clear();

  useEntries.setState({ entries: [] });
  useGoals.setState({ goals: [] });
  useLoans.setState({ loans: [], payments: [] });
  useSettings.setState({
    hideAmounts: false,
    appLock: false,
    budgetAlerts: true,
    billReminders: false,
    autopay: false,
    theme: 'auto',
  });
  useUi.getState().setMonth(monthKey(new Date()));

  await AsyncStorage.multiSet([
    ['ledger.entries', JSON.stringify({ state: { entries: [] }, version: 1 })],
    ['ledger.goals', JSON.stringify({ state: { goals: [] }, version: 1 })],
    ['ledger.loans', JSON.stringify({ state: { loans: [], payments: [] }, version: 2 })],
    ['ledger.settings', JSON.stringify({ state: {
      hideAmounts: false,
      appLock: false,
      budgetAlerts: true,
      billReminders: false,
      autopay: false,
      theme: 'auto',
    }, version: 1 })],
  ]);
}
