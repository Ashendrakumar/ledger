import { shiftMonth } from './dates';
import type { LoanPayment } from '@/types';

export interface LoanLike {
  id: string;
  principalPaise: number;
  annualRatePct: number;
  tenureMonths: number;
  startMonth: string;
}

export interface LoanScheduleRow {
  month: string;
  emi: number;
  /** Interest portion of this month's EMI, integer paise. */
  interest: number;
  /** Principal portion of this month's EMI, integer paise. */
  principal: number;
  balanceBefore: number;
  balanceAfter: number;
  paid: boolean;
  /** Amount actually paid for this month (0 when not paid). */
  paidAmount: number;
}

/** Monthly interest rate as a fraction, e.g. 8.75% p.a. -> 0.0072916... */
export const monthlyRate = (annualRatePct: number) => annualRatePct / 12 / 100;

/** Reducing-balance home / personal loan EMI: P * r * (1+r)^n / ((1+r)^n - 1). Result in paise. */
export function computeEMI(principalPaise: number, annualRatePct: number, tenureMonths: number): number {
  if (principalPaise <= 0 || tenureMonths <= 0) return 0;
  const r = monthlyRate(annualRatePct);
  if (r <= 0) return Math.round(principalPaise / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths) - 1;
  const emi = (principalPaise * r * Math.pow(1 + r, tenureMonths)) / factor;
  return Math.round(emi);
}

export interface LoanTotals {
  emi: number;
  /** EMI * tenure, with the final payment adjusted to clear the balance. */
  totalPayable: number;
  totalInterest: number;
}

export function computeLoanTotals(principalPaise: number, annualRatePct: number, tenureMonths: number): LoanTotals {
  const emi = computeEMI(principalPaise, annualRatePct, tenureMonths);
  const totalInterest = Math.max(0, emi * tenureMonths - principalPaise);
  return { emi, totalPayable: principalPaise + totalInterest, totalInterest };
}

/** Builds the month-by-month amortization schedule for a loan, replaying payments. */
export function buildSchedule(loan: LoanLike, payments: LoanPayment[]): LoanScheduleRow[] {
  const r = monthlyRate(loan.annualRatePct);
  const emi = computeEMI(loan.principalPaise, loan.annualRatePct, loan.tenureMonths);
  const payByMonth = new Map(payments.filter((p) => p.loanId === loan.id).map((p) => [p.month, p]));
  const n = Math.max(1, loan.tenureMonths);
  let balance = loan.principalPaise;
  const rows: LoanScheduleRow[] = [];
  for (let i = 0; i < n; i++) {
    const month = shiftMonth(loan.startMonth, i);
    const interest = Math.round(balance * r);
    const principalPart = i === n - 1 ? Math.max(0, balance - interest) : Math.max(0, emi - interest);
    const payment = payByMonth.get(month);
    const paid = !!payment;
    const paidAmount = payment?.amountPaise ?? 0;
    const applied = paid ? Math.max(0, paidAmount - interest) : principalPart;
    const balanceAfter = balance - applied;
    rows.push({ month, emi, interest, principal: principalPart, balanceBefore: balance, balanceAfter, paid, paidAmount });
    balance = balanceAfter;
  }
  return rows;
}

/** Remaining principal for a loan after applying its payments. */
export function outstandingBalance(loan: LoanLike, payments: LoanPayment[]): number {
  const rows = buildSchedule(loan, payments);
  return rows.length ? rows[rows.length - 1].balanceAfter : loan.principalPaise;
}

/** Principal repaid so far, as a ratio of the borrowed amount (0..1). */
export function repaidRatio(loan: LoanLike, payments: LoanPayment[]): number {
  const outstanding = outstandingBalance(loan, payments);
  if (loan.principalPaise <= 0) return 0;
  return Math.max(0, Math.min(1, (loan.principalPaise - outstanding) / loan.principalPaise));
}
