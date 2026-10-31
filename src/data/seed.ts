import type { Entry, Goal } from '@/types';
import { toPaise } from '@/lib/money';

let n = 0;
const id = () => `seed-${++n}`;
const e = (
  kind: Entry['kind'], type: Entry['type'], rupees: number, category: string,
  month: string, date?: string, note?: string,
): Entry => ({ id: id(), kind, type, amountPaise: toPaise(rupees), category, month, date, note });

const OCT = '2026-10';
const planned: Entry[] = [
  e('planned', 'income', 80000, 'Salary', OCT), e('planned', 'income', 10000, 'Freelance', OCT),
  e('planned', 'expense', 22000, 'Rent', OCT), e('planned', 'expense', 10000, 'Food', OCT),
  e('planned', 'expense', 4000, 'Transport', OCT), e('planned', 'expense', 6000, 'Bills', OCT),
  e('planned', 'expense', 8000, 'Shopping', OCT), e('planned', 'expense', 5000, 'Health', OCT),
  e('planned', 'saving', 12000, 'Emergency fund', OCT), e('planned', 'saving', 8000, 'Investment', OCT),
];
const actual: Entry[] = [
  e('actual', 'income', 80000, 'Salary', OCT, '2026-10-01', 'October salary'),
  e('actual', 'income', 5000, 'Freelance', OCT, '2026-10-06', 'Logo project'),
  e('actual', 'expense', 22000, 'Rent', OCT, '2026-10-02'),
  e('actual', 'expense', 9850, 'Food', OCT, '2026-10-08', 'Groceries and eating out'),
  e('actual', 'expense', 3600, 'Transport', OCT, '2026-10-07'),
  e('actual', 'expense', 6200, 'Bills', OCT, '2026-10-05', 'Electricity and internet'),
  e('actual', 'expense', 4700, 'Shopping', OCT, '2026-10-09'),
  e('actual', 'expense', 2000, 'Health', OCT, '2026-10-04'),
  e('actual', 'saving', 15000, 'Emergency fund', OCT, '2026-10-03'),
];
// Earlier months, so Balance and the bar chart have history.
const history: Entry[] = [
  ['2026-05', 90000, 49000], ['2026-06', 92000, 51000], ['2026-07', 92000, 58000],
  ['2026-08', 94000, 52000], ['2026-09', 92000, 55000],
].flatMap(([m, inc, exp]) => [
  e('actual', 'income', inc as number, 'Salary', m as string, `${m}-01`),
  e('actual', 'expense', exp as number, 'Rent', m as string, `${m}-02`),
  e('actual', 'saving', 12000, 'Emergency fund', m as string, `${m}-03`),
]);

export const seedEntries: Entry[] = [...history, ...planned, ...actual];

export const seedGoals: Goal[] = [
  { id: 'g1', name: 'Emergency fund', targetPaise: toPaise(100000), savedPaise: toPaise(60000), targetMonth: '2026-12' },
  { id: 'g2', name: 'New laptop', targetPaise: toPaise(80000), savedPaise: toPaise(20000), targetMonth: '2027-03' },
  { id: 'g3', name: 'Family trip', targetPaise: toPaise(40000), savedPaise: toPaise(12000), targetMonth: '2027-05' },
];
