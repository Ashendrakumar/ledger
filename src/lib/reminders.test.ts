import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { emiReminderContent } from './reminderContent';
import { formatINR } from './money';
import type { LoanScheduleRow } from './emi';

const row = { emi: 11993 } as Pick<LoanScheduleRow, 'emi'>;

describe('emiReminderContent', () => {
  it('includes the EMI amount when amounts are visible', () => {
    const c = emiReminderContent('Home Loan', 'l1', row, 3, false);
    assert.equal(c.title, 'Home Loan EMI');
    assert.equal(c.body, `EMI ${formatINR(11993)} due in 3 days.`);
    assert.match(c.body, /₹/);
    assert.deepEqual(c.data, { type: 'emi', loanId: 'l1' });
  });

  it('omits the amount when hideAmounts is on', () => {
    const c = emiReminderContent('Home Loan', 'l1', row, 3, true);
    assert.equal(c.body, 'EMI due in 3 days.');
    assert.doesNotMatch(c.body, /₹/);
  });

  it('says "due today" on the day of the reminder', () => {
    const c = emiReminderContent('Home Loan', 'l1', row, 0, false);
    assert.equal(c.body, `EMI ${formatINR(11993)} due today.`);
  });
});
