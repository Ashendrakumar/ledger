import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { storage } from './persist';

interface AuthState {
  user: User | null;
  /** True once persisted state has been read from disk. */
  hydrated: boolean;
  setupComplete: boolean;
  completeSetup: () => void;
  signIn: (email: string) => void;
  signOut: () => void;
}

/**
 * Local-only stub. Replace `signIn` with a call to your backend that sends
 * the 6-digit email code, then stores the returned session.
 */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setupComplete: false,
      completeSetup: () => set({ setupComplete: true }),
      signIn: (email) => set({ user: { email } }),
      signOut: () => set({ user: null }),
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
