import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from '@/types';
import { ApiError, completeOnboarding, getAccessToken, refreshSession, setAccessToken } from './api';
import { getRefreshToken, setRefreshToken } from './authTokens';

const keyFor = (userId: string) => `ledger.pending-onboarding.${userId}`;

export async function queueOnboarding(userId: string, entries: Entry[]) {
  const key = keyFor(userId);
  await AsyncStorage.setItem(key, JSON.stringify(entries));
}

export async function flushOnboarding(userId: string) {
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
    let accessToken = getAccessToken();
    if (!accessToken) return;
    try {
      await completeOnboarding(payload, accessToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return;
      const refreshed = await refreshSession(refreshToken);
      await setRefreshToken(refreshed.tokens.refreshToken);
      accessToken = refreshed.tokens.accessToken;
      setAccessToken(accessToken);
      await completeOnboarding(payload, accessToken);
    }
    await AsyncStorage.removeItem(key);
  } catch (error) {
    // Leave the payload queued for a later launch/retry. Conflicts need explicit resolution.
    if (error instanceof ApiError && error.status === 409) return;
  }
}
