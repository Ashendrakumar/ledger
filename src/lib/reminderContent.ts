import { formatINR } from './money';
import type { LoanScheduleRow } from './emi';

/** Notification content for an EMI reminder; amounts are omitted when the setting is on. */
export function emiReminderContent(
  loanName: string,
  loanId: string,
  row: Pick<LoanScheduleRow, 'emi'>,
  daysBefore: number,
  hideAmounts: boolean,
): { title: string; body: string; data: { type: 'emi'; loanId: string } } {
  const amount = hideAmounts ? 'EMI' : `EMI ${formatINR(row.emi)}`;
  return {
    title: `${loanName} EMI`,
    body: daysBefore === 0 ? `${amount} due today.` : `${amount} due in ${daysBefore} days.`,
    data: { type: 'emi', loanId },
  };
}
