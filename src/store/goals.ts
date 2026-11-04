import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal } from '@/types';
import { seedGoals } from '@/data/seed';
import { storage } from './persist';

interface GoalsState {
  goals: Goal[];
  addMoney: (id: string, paise: number) => void;
  add: (g: Omit<Goal, 'id' | 'savedPaise'>) => void;
  /** Patch any goal fields; clamps savedPaise to the new target when target changes. */
  update: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void;
  remove: (id: string) => void;
}

export const useGoals = create<GoalsState>()(
  persist(
    (set) => ({
      goals: seedGoals,
      addMoney: (id, paise) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, savedPaise: Math.min(g.targetPaise, g.savedPaise + paise) } : g,
          ),
        })),
      add: (g) => set((s) => ({ goals: [...s.goals, { ...g, id: `g${Date.now()}`, savedPaise: 0 }] })),
      update: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            const next = { ...g, ...patch };
            next.savedPaise = Math.min(Math.max(0, next.savedPaise), Math.max(0, next.targetPaise));
            return next;
          }),
        })),
      remove: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
    }),
    { name: 'ledger.goals', storage, version: 1 },
  ),
);
