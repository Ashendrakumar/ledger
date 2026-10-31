import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal } from '@/types';
import { seedGoals } from '@/data/seed';
import { storage } from './persist';

interface GoalsState {
  goals: Goal[];
  addMoney: (id: string, paise: number) => void;
  add: (g: Omit<Goal, 'id' | 'savedPaise'>) => void;
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
    }),
    { name: 'ledger.goals', storage, version: 1 },
  ),
);
