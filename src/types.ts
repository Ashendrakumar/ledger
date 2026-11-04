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
  /** Links an expense entry to the loan payment that created it (EMI/prepayment tracking). */
  loanPaymentId?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetPaise: number;
  savedPaise: number;
  /** 'YYYY-MM' */
  targetMonth: string;
}

export type PaymentKind = 'actual' | 'planned' | 'prepayment';

export interface Loan {
  id: string;
  name: string;
  /** Amount borrowed, integer paise. */
  principalPaise: number;
  /** Annual interest rate in percent, e.g. 8.75 for 8.75%. */
  annualRatePct: number;
  /** Total tenure in months. */
  tenureMonths: number;
  /** 'YYYY-MM' */
  startMonth: string;
  /** EMI in paise, derived from principal / rate / tenure. */
  emiPaise: number;
  /** Day of month the EMI is due (1..31). Defaults to 5. */
  dueDay?: number;
  /** When true, recording an actual payment also logs an expense entry in the ledger. */
  trackExpenses?: boolean;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  /** 'YYYY-MM' */
  month: string;
  /** Integer paise actually paid, or the planned EMI when kind is 'planned'. */
  amountPaise: number;
  kind: PaymentKind;
  /** 'YYYY-MM-DD', actual payments only. */
  date?: string;
  note?: string;
}

export interface User {
  email: string;
  name?: string;
}
