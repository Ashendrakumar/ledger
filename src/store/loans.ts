import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Loan, LoanPayment, PaymentKind } from '@/types';
import { computeEMI, DEFAULT_DUE_DAY } from '@/lib/emi';
import { storage } from './persist';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const KIND_SET: PaymentKind[] = ['actual', 'planned', 'prepayment'];

/** Repairs a persisted loans blob: drops invalid rows, clamps numbers, backfills dueDay. */
function migrateLoansState(persisted: unknown): { loans: Loan[]; payments: LoanPayment[] } {
  const s = (persisted ?? {}) as { loans?: unknown; payments?: unknown };
  const rawLoans = Array.isArray(s.loans) ? (s.loans as Record<string, unknown>[]) : [];
  const loans: Loan[] = [];
  for (const l of rawLoans) {
    const principalPaise = Math.round(Number(l.principalPaise));
    const annualRatePct = Number(l.annualRatePct);
    const tenureMonths = Math.round(Number(l.tenureMonths));
    if (!(principalPaise > 0) || !Number.isFinite(annualRatePct) || annualRatePct < 0 || annualRatePct > 100 || !(tenureMonths >= 1) || tenureMonths > 480 || !MONTH_RE.test(String(l.startMonth))) continue;
    const emiPaise = Number(l.emiPaise) > 0 ? Math.round(Number(l.emiPaise)) : computeEMI(principalPaise, annualRatePct, tenureMonths);
    const dueDay = Math.min(31, Math.max(1, Math.round(Number(l.dueDay ?? DEFAULT_DUE_DAY)) || DEFAULT_DUE_DAY));
    loans.push({ ...(l as unknown as Loan), principalPaise, annualRatePct, tenureMonths, emiPaise, dueDay });
  }
  const loanIds = new Set(loans.map((l) => l.id));
  const rawPayments = Array.isArray(s.payments) ? (s.payments as Record<string, unknown>[]) : [];
  const payments: LoanPayment[] = [];
  for (const p of rawPayments) {
    const amountPaise = Math.round(Number(p.amountPaise));
    const month = String(p.month ?? '');
    const kind = KIND_SET.includes(p.kind as PaymentKind) ? (p.kind as PaymentKind) : 'actual';
    if (!loanIds.has(String(p.loanId)) || !(amountPaise >= 0) || !MONTH_RE.test(month)) continue;
    payments.push({ ...(p as unknown as LoanPayment), amountPaise, kind, month });
  }
  return { loans, payments };
}

interface LoansState {
  loans: Loan[];
  payments: LoanPayment[];
  add: (l: Omit<Loan, 'id' | 'emiPaise'>) => Loan;
  updateLoan: (id: string, patch: Partial<Omit<Loan, 'id' | 'emiPaise'>>) => void;
  remove: (id: string) => void;
  /** Creates or updates the payment recorded for a loan month. Returns the payment. */
  markPayment: (p: { loanId: string; month: string; amountPaise: number; kind: PaymentKind; date?: string; note?: string }) => LoanPayment;
  removePayment: (id: string) => void;
}

export const useLoans = create<LoansState>()(
  persist(
    (set, get) => ({
      loans: [],
      payments: [],
      add: (l) => {
        const loan: Loan = { ...l, id: uid(), emiPaise: computeEMI(l.principalPaise, l.annualRatePct, l.tenureMonths), dueDay: l.dueDay ?? DEFAULT_DUE_DAY };
        set((s) => ({ loans: [...s.loans, loan] }));
        return loan;
      },
      updateLoan: (id, patch) =>
        set((s) => ({
          loans: s.loans.map((l) => {
            if (l.id !== id) return l;
            const next = { ...l, ...patch };
            // EMI is derived — recompute it whenever an input changes.
            next.emiPaise = computeEMI(next.principalPaise, next.annualRatePct, next.tenureMonths);
            return next;
          }),
        })),
      remove: (id) =>
        set((s) => ({
          loans: s.loans.filter((l) => l.id !== id),
          payments: s.payments.filter((p) => p.loanId !== id),
        })),
      markPayment: (p) => {
        // Installments upsert per loan+month; prepayments always create a new entry.
        const existing = p.kind === 'prepayment' ? undefined : get().payments.find((x) => x.loanId === p.loanId && x.month === p.month && x.kind !== 'prepayment');
        const payment: LoanPayment = { id: existing?.id ?? uid(), ...p };
        set((s) => ({
          payments: existing ? s.payments.map((x) => (x.id === existing.id ? payment : x)) : [...s.payments, payment],
        }));
        return payment;
      },
      removePayment: (id) => set((s) => ({ payments: s.payments.filter((x) => x.id !== id) })),
    }),
    { name: 'ledger.loans', storage, version: 2, migrate: (persisted) => migrateLoansState(persisted) },
  ),
);
