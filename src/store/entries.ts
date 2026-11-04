import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Entry, Kind } from '@/types';
import { seedEntries } from '@/data/seed';
import { shiftMonth } from '@/lib/dates';
import { storage } from './persist';

interface EntriesState {
  entries: Entry[];
  add: (e: Omit<Entry, 'id'>) => void;
  update: (id: string, patch: Partial<Omit<Entry, 'id'>>) => void;
  remove: (id: string) => void;
  /** Removes the entries linked to any of the given loan payment ids. */
  removeLoanPaymentEntries: (paymentIds: string[]) => void;
  /** Copies planned entries of the previous month into `month`. Returns count. */
  copyPlanFromPrevious: (month: string) => number;  clearAll: () => void;
  loadSample: () => void;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const useEntries = create<EntriesState>()(
  persist(
    (set, get) => ({
      entries: seedEntries,
      add: (e) => set((s) => ({ entries: [{ ...e, id: uid() }, ...s.entries] })),
      update: (id, patch) =>
        set((s) => ({ entries: s.entries.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      remove: (id) => set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
      removeLoanPaymentEntries: (paymentIds) =>
        set((s) => ({ entries: s.entries.filter((x) => !(x.loanPaymentId && paymentIds.includes(x.loanPaymentId))) })),
      copyPlanFromPrevious: (month) => {
        const prev = shiftMonth(month, -1);
        const source = get().entries.filter((x) => x.kind === 'planned' && x.month === prev);
        set((s) => ({
          entries: [...source.map((x) => ({ ...x, id: uid(), month })), ...s.entries],
        }));
        return source.length;
      },
      clearAll: () => set({ entries: [] }),
      loadSample: () => set({ entries: seedEntries }),
    }),
    { name: 'ledger.entries', storage, version: 1 },
  ),
);

export type { Kind };
