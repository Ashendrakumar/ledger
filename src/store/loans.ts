import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Kind, Loan, LoanPayment } from '@/types';
import { computeEMI } from '@/lib/emi';
import { storage } from './persist';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

interface LoansState {
  loans: Loan[];
  payments: LoanPayment[];
  add: (l: Omit<Loan, 'id' | 'emiPaise'>) => Loan;
  remove: (id: string) => void;
  /** Creates or updates the payment recorded for a loan month. */
  markPayment: (p: { loanId: string; month: string; amountPaise: number; kind: Kind; date?: string; note?: string }) => void;
  removePayment: (id: string) => void;
}

export const useLoans = create<LoansState>()(
  persist(
    (set) => ({
      loans: [],
      payments: [],
      add: (l) => {
        const loan: Loan = { ...l, id: uid(), emiPaise: computeEMI(l.principalPaise, l.annualRatePct, l.tenureMonths) };
        set((s) => ({ loans: [...s.loans, loan] }));
        return loan;
      },
      remove: (id) =>
        set((s) => ({
          loans: s.loans.filter((l) => l.id !== id),
          payments: s.payments.filter((p) => p.loanId !== id),
        })),
      markPayment: (p) =>
        set((s) => {
          const existing = s.payments.find((x) => x.loanId === p.loanId && x.month === p.month);
          const payment: LoanPayment = { id: existing?.id ?? uid(), ...p };
          return { payments: existing ? s.payments.map((x) => (x.id === existing.id ? payment : x)) : [...s.payments, payment] };
        }),
      removePayment: (id) => set((s) => ({ payments: s.payments.filter((x) => x.id !== id) })),
    }),
    { name: 'ledger.loans', storage, version: 1 },
  ),
);
