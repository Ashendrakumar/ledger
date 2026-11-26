import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from '@/types';
import { ApiError, completeOnboarding } from './api';
import { isMockUserId } from './mockAuth';

const keyFor = (userId: string) => `ledger.pending-onboarding.${userId}`;

export async function queueOnboarding(userId: string, entries: Entry[]) {
  if (isMockUserId(userId)) return;
  const key = keyFor(userId);
  await AsyncStorage.setItem(key, JSON.stringify(entries));
}

export async function flushOnboarding(userId: string) {
  if (isMockUserId(userId)) return;
  try {
    const key = keyFor(userId);
    const serialized = await AsyncStorage.getItem(key);
    if (!serialized) return;
    const entries = JSON.parse(serialized) as Entry[];
    const payload = entries.map((entry) => ({
      clientId: entry.id,
      kind: 'planned' as const,
      type: entry.type,
      amountPaise: entry.amountPaise,
      category: entry.category,
      month: entry.month,
      ...(entry.note ? { note: entry.note } : {}),
    }));
    await completeOnboarding(payload);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    // Leave the payload queued for a later launch/retry. Conflicts need explicit resolution.
    if (error instanceof ApiError && error.status === 409) return;
  }
}
