import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Entry, User } from '@/types';
import { storage } from './persist';
import { ApiError, getAccessToken, logoutSession, refreshSession, requestEmailCode, setAccessToken, verifyEmailCode } from '@/lib/api';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from '@/lib/authTokens';
import { queueOnboarding } from '@/lib/onboardingQueue';

interface AuthState {
  user: User | null;
  /** True once persisted state has been read from disk. */
  hydrated: boolean;
  setupComplete: boolean;
  sessionChecked: boolean;
  completeSetup: (entries: Entry[]) => Promise<void>;
  requestCode: (email: string) => Promise<void>;
  signIn: (email: string, code: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

let sessionRestore: Promise<void> | null = null;

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      setupComplete: false,
      sessionChecked: false,
      completeSetup: async (entries) => {
        set({ setupComplete: true });
        const userId = get().user?.id;
        if (userId && entries.length) await queueOnboarding(userId, entries);
      },
      requestCode: async (email) => { await requestEmailCode(email.trim().toLowerCase()); },
      signIn: async (email, code) => {
        const result = await verifyEmailCode(email.trim().toLowerCase(), code);
        await setRefreshToken(result.tokens.refreshToken);
        setAccessToken(result.tokens.accessToken);
        set({
          user: { id: result.user.id, email: result.user.email, name: result.user.name },
          setupComplete: Boolean(result.user.setupCompleted),
          sessionChecked: true,
        });
      },
      restoreSession: async () => {
        if (!get().hydrated || get().sessionChecked) return;
        if (sessionRestore) return sessionRestore;
        sessionRestore = (async () => {
          try {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
              set({ user: null, setupComplete: false, sessionChecked: true });
              return;
            }
            const result = await refreshSession(refreshToken);
            await setRefreshToken(result.tokens.refreshToken);
            setAccessToken(result.tokens.accessToken);
            set({
              user: { id: result.user.id, email: result.user.email, name: result.user.name },
              setupComplete: Boolean(result.user.setupCompleted) || get().setupComplete,
              sessionChecked: true,
            });
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
              await clearRefreshToken().catch(() => {});
              setAccessToken(null);
              set({ user: null, setupComplete: false });
            }
            // Keep a previously signed-in local cache available while offline.
            set({ sessionChecked: true });
          }
        })();
        try { await sessionRestore; } finally { sessionRestore = null; }
      },
      signOut: async () => {
        const refreshToken = await getRefreshToken().catch(() => null);
        const accessToken = getAccessToken();
        if (refreshToken && accessToken) {
          try { await logoutSession(refreshToken, accessToken); } catch { /* Local sign-out must work offline. */ }
        }
        await clearRefreshToken().catch(() => {});
        setAccessToken(null);
        set({ user: null, setupComplete: false });
      },
    }),
    {
      name: 'ledger.auth',
      storage,
      version: 1,
      partialize: (s) => ({ user: s.user, setupComplete: s.setupComplete }),
      onRehydrateStorage: () => () => useAuth.setState({ hydrated: true }),
    },
  ),
);
