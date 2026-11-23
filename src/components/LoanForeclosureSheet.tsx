import { useMemo } from 'react';
import { View } from 'react-native';
import { colors } from '@/theme';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Money } from './ui/Money';
import { Sheet } from './ui/Sheet';
import { monthKey } from '@/lib/dates';
import type { Loan } from '@/types';
import type { LoanOverview } from '@/lib/emi';

function monthsBetween(a: string, b: string): number {
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, borderTopWidth: 1, borderTopColor: colors.border }}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="subheading">{value}</AppText>
    </View>
  );
}

/** Foreclosure/early-closure summary: months remaining and interest saved if closed now. */
export function LoanForeclosureSheet({ loan, ov, onClose }: { loan: Loan; ov: LoanOverview; onClose: () => void }) {
  const monthsLeft = useMemo(() => {
    const last = ov.schedule[ov.schedule.length - 1]?.month;
    if (!last || ov.closedIn) return 0;
    return Math.max(0, monthsBetween(monthKey(new Date()), last));
  }, [ov]);

  return (
    <Sheet onDismiss={onClose}
      footer={<View style={{ flexDirection: 'row' }}><Button label="Close" height={52} variant="danger" style={{ flex: 1 }} onPress={onClose} /></View>}>
      <View style={{ gap: 4 }}>
        <AppText variant="subheading">{loan.name} · Close early (foreclosure)</AppText>
        <AppText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 2 }}>
          {monthsLeft === 0 && ov.closedIn ? 'This loan is already closed.' : `Repaying now settles the loan and ends the remaining schedule.`}
        </AppText>
      </View>
      <FactRow label="Outstanding" value={<Money paise={ov.outstanding} />} />
      <FactRow label="Months remaining" value={monthsLeft === 0 && ov.closedIn ? 'Closed' : `${monthsLeft} months`} />
      <FactRow label="Interest saved if repaid now" value={<Money paise={ov.remainingInterest} color={colors.expense} />} />
    </Sheet>
  );
}
