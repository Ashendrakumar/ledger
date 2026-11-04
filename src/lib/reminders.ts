import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notifications } from '@/lib/notifications';
import type { Loan, LoanPayment } from '@/types';
import { getLoanOverview, dueDayOf } from './emi';
import { formatINR } from './money';
import { monthKey, shiftMonth } from './dates';
import { router } from 'expo-router';
import { useLoans } from '@/store/loans';
import { useSettings } from '@/store/settings';

const IDS_KEY = 'ledger.emiReminderIds';
const HOUR = 9;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestEmiReminderPermission(): Promise<boolean> {
  try {
    const res = await Notifications.requestPermissionsAsync();
    return !!res.granted;
  } catch {
    return false;
  }
}

async function getStoredIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(IDS_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function setStoredIds(ids: string[]) {
  try {
    await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable — worst case a stale id lingers, it is still cancelled on the next sync */
  }
}

async function cancelIds(ids: string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/**
 * Idempotent reminder sync. Cancels every EMI reminder we previously scheduled,
 * then re-creates due/pre-due notifications for unsettled installments in the
 * current and next month. No-ops safely when permission is missing, the module
 * is unavailable (Expo Go) or reminders are disabled.
 */
export async function syncEmiReminders(loans: Loan[], payments: LoanPayment[]): Promise<void> {
  if (Platform.OS === 'web') return;
  const stale = await getStoredIds();
  await cancelIds(stale);
  if (!useSettings.getState().billReminders) {
    await setStoredIds([]);
    return;
  }
  let granted = false;
  try {
    const res = await Notifications.getPermissionsAsync();
    granted = !!res.granted;
  } catch {
    granted = false;
  }
  if (!granted) {
    await setStoredIds([]);
    return;
  }

  const hide = useSettings.getState().hideAmounts;
  const now = new Date();
  const months = [monthKey(now), shiftMonth(monthKey(now), 1)];
  const newIds: string[] = [];

  for (const loan of loans) {
    const ov = getLoanOverview(loan, payments, now);
    const dueDay = dueDayOf(loan);
    for (const m of months) {
      const row = ov.rowFor(m);
      if (!row || row.paid) continue;
      const [y, mm] = m.split('-').map(Number);
      const dueDate = new Date(y, mm - 1, dueDay, HOUR, 0, 0, 0);
      for (const daysBefore of [3, 0] as const) {
        const fire = new Date(dueDate);
        fire.setDate(fire.getDate() - daysBefore);
        if (fire.getTime() <= now.getTime()) continue;
        const amount = hide ? 'EMI' : `EMI ${formatINR(row.emi)}`;
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${loan.name} EMI`,
              body: daysBefore === 0 ? `${amount} due today.` : `${amount} due in ${daysBefore} days.`,
              data: { type: 'emi', loanId: loan.id },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
          });
          newIds.push(id);
        } catch {
          /* scheduling unavailable (e.g. Expo Go) — badge UI still works */
        }
      }
    }
  }
  await setStoredIds(newIds);
}

/** Subscribes to loan/payment/settings changes and re-syncs reminders (debounced). Call once at root. */
export function initEmiReminderSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      syncEmiReminders(useLoans.getState().loans, useLoans.getState().payments).catch(() => {});
    }, 400);
  };
  const unsubLoans = useLoans.subscribe(run);
  const unsubSettings = useSettings.subscribe(run);
  run();
  const tap = Notifications.addNotificationResponseReceivedListener((resp: { notification: { request: { content: { data?: unknown } } } }) => {
    const data = resp.notification.request.content.data as { type?: string; loanId?: string };
    if (data?.type === 'emi' && data.loanId) {
      router.push({ pathname: '/loan/[id]', params: { id: data.loanId } });
    }
  });
  return () => {
    tap.remove();
    unsubLoans();
    unsubSettings();
    if (timer) clearTimeout(timer);
  };
}
