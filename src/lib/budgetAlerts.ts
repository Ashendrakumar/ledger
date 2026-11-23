import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notifications } from '@/lib/notifications';
import { useEntries } from '@/store/entries';
import { useSettings } from '@/store/settings';
import { monthKey } from '@/lib/dates';

const KEY = 'ledger.budgetAlertEvents';
const MILESTONES = [0.8, 1] as const;

export async function requestBudgetAlertPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try { return !!(await Notifications.requestPermissionsAsync()).granted; } catch { return false; }
}

/** Notify once per category and threshold when actual monthly spending reaches its plan. */
export async function syncBudgetAlerts(): Promise<void> {
  if (Platform.OS === 'web' || !useSettings.getState().budgetAlerts) return;
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    const raw = await AsyncStorage.getItem(KEY);
    const sent = new Set<string>(raw ? JSON.parse(raw) as string[] : []);
    const entries = useEntries.getState().entries;
    const month = monthKey(new Date());
    const categories = new Set(entries.filter((e) => e.month === month && e.type === 'expense').map((e) => e.category));
    let changed = false;
    for (const category of categories) {
      const planned = entries.filter((e) => e.month === month && e.kind === 'planned' && e.type === 'expense' && e.category === category).reduce((n, e) => n + e.amountPaise, 0);
      const spent = entries.filter((e) => e.month === month && e.kind === 'actual' && e.type === 'expense' && e.category === category).reduce((n, e) => n + e.amountPaise, 0);
      if (planned <= 0 || spent < planned * 0.8) continue;
      for (const milestone of MILESTONES) {
        const id = `${month}:${category}:${milestone}`;
        if (sent.has(id) || spent < planned * milestone) continue;
        const hidden = useSettings.getState().hideAmounts;
        await Notifications.scheduleNotificationAsync({ content: {
          title: milestone === 1 ? `${category} budget reached` : `${category} budget almost used`,
          body: hidden ? (milestone === 1 ? 'You reached this month’s planned amount.' : 'You’ve used 80% of this month’s planned amount.') : (milestone === 1 ? 'You’ve reached your planned amount for this month.' : 'You’ve used 80% of your planned amount this month.'),
          data: { type: 'budget', month, category },
        }, trigger: null });
        sent.add(id);
        changed = true;
      }
    }
    if (changed) await AsyncStorage.setItem(KEY, JSON.stringify([...sent]));
  } catch { /* Notifications and storage may be unavailable (for example in Expo Go). */ }
}

export function initBudgetAlertSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void syncBudgetAlerts(); }, 400);
  };
  const a = useEntries.subscribe(schedule);
  const b = useSettings.subscribe(schedule);
  schedule();
  return () => { a(); b(); if (timer) clearTimeout(timer); };
}
