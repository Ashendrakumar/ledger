import type { Entry, EntryType, Kind } from '@/types';
import { shiftMonth } from './dates';

export const sum = (xs: Entry[]) => xs.reduce((a, x) => a + x.amountPaise, 0);

export const inMonth = (entries: Entry[], month: string, kind: Kind) =>
  entries.filter((x) => x.kind === kind && x.month === month);

export const total = (entries: Entry[], month: string, kind: Kind, type: EntryType) =>
  sum(inMonth(entries, month, kind).filter((x) => x.type === type));

/** Balance across all months: income − expenses − savings (actual only). */
export function balance(entries: Entry[], uptoMonth?: string): number {
  return entries
    .filter((x) => x.kind === 'actual' && (!uptoMonth || x.month <= uptoMonth))
    .reduce((a, x) => a + (x.type === 'income' ? x.amountPaise : -x.amountPaise), 0);
}

export function balanceTrend(entries: Entry[], endMonth: string, count = 6): number[] {
  return Array.from({ length: count }, (_, i) => balance(entries, shiftMonth(endMonth, i - (count - 1))));
}

export interface CategoryRow {
  category: string;
  planned: number;
  actual: number;
}
export function byCategory(entries: Entry[], month: string, type: EntryType): CategoryRow[] {
  const map = new Map<string, CategoryRow>();
  for (const x of entries) {
    if (x.month !== month || x.type !== type) continue;
    const row = map.get(x.category) ?? { category: x.category, planned: 0, actual: 0 };
    row[x.kind === 'planned' ? 'planned' : 'actual'] += x.amountPaise;
    map.set(x.category, row);
  }
  return [...map.values()].sort((a, b) => Math.max(b.actual, b.planned) - Math.max(a.actual, a.planned));
}

export function monthlyHistory(entries: Entry[], endMonth: string, count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(endMonth, i - (count - 1));
    return {
      month,
      income: total(entries, month, 'actual', 'income'),
      expense: total(entries, month, 'actual', 'expense'),
    };
  });
}
