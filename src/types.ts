export type Kind = 'actual' | 'planned';
export type EntryType = 'expense' | 'income' | 'saving';

export interface Entry {
  id: string;
  kind: Kind;
  type: EntryType;
  /** integer paise, never a float */
  amountPaise: number;
  category: string;
  /** 'YYYY-MM' */
  month: string;
  /** 'YYYY-MM-DD', actual entries only */
  date?: string;
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetPaise: number;
  savedPaise: number;
  /** 'YYYY-MM' */
  targetMonth: string;
}

export interface User {
  email: string;
  name?: string;
}
