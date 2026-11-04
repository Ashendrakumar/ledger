import { shiftMonth, monthKey } from './dates';
import type { Loan, LoanPayment } from '@/types';

export interface LoanLike {
  id: string;
  principalPaise: number;
  annualRatePct: number;
  tenureMonths: number;
  startMonth: string;
  dueDay?: number;
}

export type RowStatus = 'paid' | 'planned' | 'partial' | 'upcoming' | 'due' | 'overdue' | 'closed';

export interface LoanScheduleRow {
  month: string;
  /** Contractual EMI for this installment (constant per loan; rows after closure show 0). */
  emi: number;
  /** Interest portion, integer paise. */
  interest: number;
  /** Principal portion, integer paise. */
  principal: number;
  balanceBefore: number;
  balanceAfter: number;
  /** Amount actually applied to principal this month (EMI principal part + any prepayment). */
  applied: number;
  paid: boolean;
  /** Amount counting toward the installment (actual + planned payments). Prepayments excluded. */
  paidAmount: number;
  status: RowStatus;
  /** True once the balance has hit zero — later rows accrue nothing. */
  closed: boolean;
}

/** Monthly interest rate as a fraction, e.g. 8.75% p.a. -> 0.0072916... */
export const monthlyRate = (annualRatePct: number) => annualRatePct / 12 / 100;

/** Day of month the EMI falls due; defaults to 5. */
export const dueDayOf = (loan: LoanLike) => Math.min(31, Math.max(1, Math.trunc(loan.dueDay ?? 5) || 5));

export const DEFAULT_DUE_DAY = 5;

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

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Builds the month-by-month amortization schedule replaying payments.
 * - Short payments reduce principal only; they never re-amortize the loan.
 * - Prepayments are lump sums applied entirely to principal.
 * - Overpay is clamped at the outstanding balance; once the balance reaches zero
 *   the remaining rows accrue nothing and are marked `closed`.
 */
export function buildSchedule(loan: LoanLike, payments: LoanPayment[], today: Date = new Date()): LoanScheduleRow[] {
  const r = monthlyRate(loan.annualRatePct);
  const emi = computeEMI(loan.principalPaise, loan.annualRatePct, loan.tenureMonths);
  const payByMonth = new Map<string, LoanPayment[]>();
  for (const p of payments) {
    if (p.loanId !== loan.id) continue;
    const list = payByMonth.get(p.month) ?? [];
    list.push(p);
    payByMonth.set(p.month, list);
  }
  const n = Math.max(1, Math.trunc(loan.tenureMonths));
  const todayKey = monthKey(today);
  const todayDay = today.getDate();
  const dueDay = dueDayOf(loan);
  let balance = Math.max(0, Math.round(loan.principalPaise));
  const rows: LoanScheduleRow[] = [];
  for (let i = 0; i < n; i++) {
    const month = shiftMonth(loan.startMonth, i);
    if (balance <= 0) {
      rows.push({ month, emi: 0, interest: 0, principal: 0, balanceBefore: 0, balanceAfter: 0, applied: 0, paid: true, paidAmount: 0, status: 'closed', closed: true });
      continue;
    }
    const interest = Math.round(balance * r);
    const isLast = i === n - 1;
    const principalPart = isLast ? balance : Math.max(0, emi - interest);
    const monthPayments = payByMonth.get(month) ?? [];
    const actualAmt = monthPayments.filter((p) => p.kind === 'actual').reduce((a, p) => a + Math.max(0, p.amountPaise), 0);
    const plannedAmt = monthPayments.filter((p) => p.kind === 'planned').reduce((a, p) => a + Math.max(0, p.amountPaise), 0);
    const prepayAmt = monthPayments.filter((p) => p.kind === 'prepayment').reduce((a, p) => a + Math.max(0, p.amountPaise), 0);
    const coverAmt = actualAmt + plannedAmt;
    const settled = coverAmt >= emi;
    // Contract amortizes by the scheduled principal part; any payment replaces that
    // with (paid − interest), so short payments slow the payoff (never speed it up).
    const appliedEmi = coverAmt > 0 ? clamp(coverAmt - interest, 0, balance) : principalPart;
    const appliedPrepay = clamp(prepayAmt, 0, balance - appliedEmi);
    const applied = appliedEmi + appliedPrepay;
    const balanceAfter = balance - applied;
    const closed = balanceAfter <= 0;

    let status: RowStatus;
    if (settled) status = actualAmt >= emi ? 'paid' : 'planned';
    else if (coverAmt > 0) status = 'partial';
    else if (month < todayKey) status = 'overdue';
    else if (month === todayKey) status = todayDay >= dueDay ? 'due' : 'upcoming';
    else status = 'upcoming';

    rows.push({
      month,
      emi,
      interest,
      principal: principalPart,
      balanceBefore: balance,
      balanceAfter,
      applied,
      paid: settled,
      paidAmount: coverAmt,
      status,
      closed,
    });
    balance = balanceAfter;
  }
  return rows;
}

export interface LoanOverview {
  schedule: LoanScheduleRow[];
  outstanding: number;
  repaid: number;
  ratio: number;
  /** Remaining interest across all unsettled, unclosed rows. */
  remainingInterest: number;
  /** Row for the given month, if inside the schedule. */
  rowFor: (month: string) => LoanScheduleRow | undefined;
  /** First installment still to pay, if any. */
  nextDue?: LoanScheduleRow;
  /** Unsettled rows before (or due on) today's date. */
  overdueCount: number;
  /** Month the balance reaches zero, if within tenure. */
  closedIn?: string;
}

export function getLoanOverview(loan: LoanLike, payments: LoanPayment[], today: Date = new Date()): LoanOverview {
  const schedule = buildSchedule(loan, payments, today);
  const todayKey = monthKey(today);
  // Outstanding = balance after the latest month that has elapsed (payments replayed).
  // Before the loan starts it is the principal; once the tenure ends it is zero.
  let outstanding = Math.max(0, Math.round(loan.principalPaise));
  for (const r of schedule) {
    if (r.month <= todayKey) outstanding = r.balanceAfter;
    else break;
  }
  const repaid = Math.max(0, loan.principalPaise - outstanding);
  const ratio = loan.principalPaise > 0 ? clamp(repaid / loan.principalPaise, 0, 1) : 0;
  const todayDay = today.getDate();
  const dueDay = dueDayOf(loan);
  const remainingInterest = schedule.reduce((a, r) => (r.paid || r.closed ? a : a + r.interest), 0);
  const nextDue = schedule.find((r) => !r.paid);
  const overdueCount = schedule.filter(
    (r) => !r.paid && (r.month < todayKey || (r.month === todayKey && todayDay >= dueDay)),
  ).length;
  const closedIn = schedule.find((r) => r.closed)?.month;
  return {
    schedule,
    outstanding,
    repaid,
    ratio,
    remainingInterest,
    rowFor: (month: string) => schedule.find((r) => r.month === month),
    nextDue,
    overdueCount,
    closedIn,
  };
}

export interface LoanAggregate {
  outstanding: number;
  /** Sum of unsettled EMIs in the real current month (not the browsed one). */
  emiDueNow: number;
  overdue: number;
  nextDue?: { month: string; emi: number; loanId: string; loanName?: string };
}

/** Cross-loan aggregate used by Home badges/cards. */
export function aggregateLoans(loans: (LoanLike & { name?: string })[], payments: LoanPayment[], today: Date = new Date()): LoanAggregate {
  let outstanding = 0;
  let emiDueNow = 0;
  let overdue = 0;
  const cur = monthKey(today);
  let nextDue: LoanAggregate['nextDue'];
  for (const l of loans) {
    const ov = getLoanOverview(l, payments, today);
    outstanding += ov.outstanding;
    overdue += ov.overdueCount;
    const nowRow = ov.schedule.find((r) => r.month === cur);
    if (nowRow && !nowRow.paid) emiDueNow += nowRow.emi - nowRow.paidAmount;
    if (ov.nextDue) {
      if (!nextDue || ov.nextDue.month < nextDue.month) {
        nextDue = { month: ov.nextDue.month, emi: ov.nextDue.emi, loanId: l.id, loanName: (l as Loan).name };
      }
    }
  }
  return { outstanding, emiDueNow, overdue, nextDue };
}

/** Remaining principal for a loan after applying its payments. */
export function outstandingBalance(loan: LoanLike, payments: LoanPayment[]): number {
  return getLoanOverview(loan, payments).outstanding;
}

/** Principal repaid so far, as a ratio of the borrowed amount (0..1). */
export function repaidRatio(loan: LoanLike, payments: LoanPayment[]): number {
  return getLoanOverview(loan, payments).ratio;
}
