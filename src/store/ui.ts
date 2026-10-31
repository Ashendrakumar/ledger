import { create } from 'zustand';
import { monthKey } from '@/lib/dates';

/** Session UI state shared by the tabs: which month is shown. Not persisted. */
interface UiState {
  month: string;
  setMonth: (m: string) => void;
}
export const useUi = create<UiState>((set) => ({ month: monthKey(new Date()), setMonth: (month) => set({ month }) }));
