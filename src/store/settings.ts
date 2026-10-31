import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

interface SettingsState {
  hideAmounts: boolean;
  appLock: boolean;
  budgetAlerts: boolean;
  billReminders: boolean;
  set: <K extends 'hideAmounts' | 'appLock' | 'budgetAlerts' | 'billReminders'>(k: K, v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      hideAmounts: false,
      appLock: false,
      budgetAlerts: true,
      billReminders: false,
      set: (k, v) => set({ [k]: v } as Partial<SettingsState>),
    }),
    { name: 'ledger.settings', storage, version: 1 },
  ),
);
