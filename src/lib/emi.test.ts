/**
 * Unit tests for the EMI math in `./emi`.
 * Run: npx tsx --test src/lib/emi.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LoanPayment } from '@/types';
import { buildSchedule, computeEMI, computeLoanTotals, dueDayOf, getLoanOverview, type LoanLike } from './emi';

/** A fixed "today" so statuses don't depend on the real clock; the loan starts 2026-11. */
const today = new Date(2026, 9, 1); // 2026-10

const loan = (o: Partial<LoanLike>): LoanLike => ({
  id: 'l1',
  principalPaise: 100000,
  annualRatePct: 0,
  tenureMonths: 12,
  startMonth: '2026-11',
  ...o,
});

function pay(month: string, amountPaise: number, kind: LoanPayment['kind'] = 'actual'): LoanPayment {
  return { id: `${month}-${amountPaise}-${kind}`, loanId: 'l1', month, amountPaise, kind };
}

describe('computeEMI', () => {
  it('reducing-balance EMI for the plan example (₹12,00,000 @ 8.75%, 180 mo)', () => {
    assert.equal(computeEMI(1200000, 8.75, 180), 11993);
  });

  it('zero-rate falls back to principal / tenure; invalid inputs give 0', () => {
    assert.equal(computeEMI(100000, 0, 12), 8333);
    assert.equal(computeEMI(0, 8.75, 12), 0);
    assert.equal(computeEMI(100000, 8.75, 0), 0);
  });
});

describe('dueDayOf', () => {
  it('defaults to 5 when not set', () => {
    assert.equal(dueDayOf(loan({})), 5);
  });
});

describe('buildSchedule', () => {
  it('zero-rate: all interest 0, principal sums to principal, final row clears the balance', () => {
    const rows = buildSchedule(loan({ principalPaise: 100000, tenureMonths: 12 }), [], today);
    assert.equal(rows.length, 12);
    assert.ok(rows.every((r) => r.interest === 0));
    assert.equal(rows[0].principal, 8333);
    assert.equal(rows[11].principal, 8337);
    assert.equal(rows.reduce((a, r) => a + r.principal, 0), 100000);
    assert.equal(rows[11].balanceAfter, 0);
  });

  it('single installment (n=1): EMI = principal + interest, final row clears the balance', () => {
    const rows = buildSchedule(loan({ principalPaise: 10000, annualRatePct: 5, tenureMonths: 1 }), [], today);
    const [r] = rows;
    assert.equal(rows.length, 1);
    assert.equal(r.emi, 10042);
    assert.equal(r.interest, 42);
    assert.equal(r.principal, 10000);
    assert.equal(r.balanceAfter, 0);
    assert.equal(r.closed, true);
  });

  it('overpay is clamped at the balance — no negative balances, later rows closed', () => {
    const rows = buildSchedule(loan({ principalPaise: 10000, tenureMonths: 3 }), [pay('2026-11', 10000)], today);
    assert.ok(rows.every((r) => r.balanceAfter >= 0));
    assert.equal(rows[0].balanceAfter, 0);
    assert.equal(rows[0].closed, true);
    assert.equal(rows[1].closed, true);
    assert.equal(rows[2].closed, true);
    assert.equal(rows[1].emi, 0);
  });

  it('partial payment: row stays unpaid until the full EMI is covered', () => {
    const rows = buildSchedule(
      loan({ principalPaise: 100000, tenureMonths: 12 }),
      [pay('2026-11', 5000), pay('2026-12', 3000)],
      today,
    );
    const r0 = rows.find((r) => r.month === '2026-11');
    const r1 = rows.find((r) => r.month === '2026-12');
    assert.ok(r0);
    assert.ok(r1);
    assert.equal(r0?.status, 'partial');
    assert.equal(r0?.paid, false);
    assert.equal(r0?.balanceAfter, 95000);
    assert.equal(r1?.balanceAfter, 92000);
  });

  it('full payment marks the installment paid', () => {
    const l = loan({ principalPaise: 100000, tenureMonths: 12 });
    const payments = [pay('2026-11', 8333)];
    const r0 = buildSchedule(l, payments, today).find((r) => r.month === '2026-11');
    assert.ok(r0);
    assert.equal(r0?.paid, true);
    assert.equal(getLoanOverview(l, payments, today).outstanding, 100000); // loan starts after `today`
  });

  it('rounding: per-row interest sum tracks computeLoanTotals within a few paise', () => {
    const l = loan({ principalPaise: 1200000, annualRatePct: 8.75, tenureMonths: 180 });
    const rows = buildSchedule(l, [], today);
    const totals = computeLoanTotals(1200000, 8.75, 180);
    assert.equal(totals.emi, 11993);
    assert.ok(rows.every((r) => r.emi === 11993));
    const sumInterest = rows.reduce((a, r) => a + r.interest, 0);
    // Per-row rounding plus the final-row residual convention (the last row clears
    // the balance instead of paying emi, so its interest is absorbed) keep the two
    // sums within a few hundred paise of each other.
    assert.ok(Math.abs(sumInterest - totals.totalInterest) <= 250, `interest sum ${sumInterest} vs ${totals.totalInterest}`);
    const last = rows[rows.length - 1];
    assert.equal(last.balanceAfter, 0);
  });
});

describe('getLoanOverview', () => {
  it('fresh loan: outstanding = principal, nothing repaid, next due next month', () => {
    const ov = getLoanOverview(loan({ principalPaise: 1200000, annualRatePct: 8.75, tenureMonths: 180 }), [], today);
    assert.equal(ov.outstanding, 1200000);
    assert.equal(ov.repaid, 0);
    assert.equal(ov.ratio, 0);
    assert.equal(ov.nextDue?.month, '2026-11');
  });
});
