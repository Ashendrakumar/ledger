import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { storage } from './persist';

interface AuthState {
  user: User | null;
  /** True once persisted state has been read from disk. */
  hydrated: boolean;
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
      signIn: (email) => set({ user: { email } }),
      signOut: () => set({ user: null }),
    }),
    {
      name: 'ledger.auth',
      storage,
      version: 1,
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => () => useAuth.setState({ hydrated: true }),
    },
  ),
);
