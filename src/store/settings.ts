import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

/** 'auto' follows the system color scheme. */
export type ThemeMode = 'auto' | 'light' | 'dark';

interface SettingsState {
  hideAmounts: boolean;
  appLock: boolean;
  budgetAlerts: boolean;
  billReminders: boolean;
  autopay: boolean;
  theme: ThemeMode;
  set: <K extends 'hideAmounts' | 'appLock' | 'budgetAlerts' | 'billReminders' | 'autopay' | 'theme'>(
    k: K,
    v: K extends 'theme' ? ThemeMode : boolean,
  ) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      hideAmounts: false,
      appLock: false,
      budgetAlerts: true,
      billReminders: false,
      autopay: false,
      theme: 'auto',
      set: (k, v) => set({ [k]: v } as Partial<SettingsState>),
    }),
    { name: 'ledger.settings', storage, version: 1 },
  ),
);
