import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLoans } from '@/store/loans';
import { getLoanOverview, aggregateLoans, dueDayOf } from '@/lib/emi';
import { formatINR } from '@/lib/money';
import { shortMonth, labelMonth } from '@/lib/dates';

const iconForLoan = (name: string): React.ComponentProps<typeof Feather>['name'] => {
  const n = name.toLowerCase();
  if (n.includes('car') || n.includes('vehicle') || n.includes('auto')) return 'truck';
  if (n.includes('home') || n.includes('house') || n.includes('mortgage')) return 'home';
  if (n.includes('education') || n.includes('study') || n.includes('student')) return 'book-open';
  if (n.includes('personal')) return 'user';
  return 'percent';
};

export default function Loans() {
  const { loans, payments } = useLoans();

  const rows = useMemo(
    () =>
      loans.map((l) => {
        const ov = getLoanOverview(l, payments);
        const repaid = Math.max(0, l.principalPaise - ov.outstanding);
        const payoffMonth = ov.schedule.length ? ov.schedule[ov.schedule.length - 1].month : undefined;
        return { loan: l, outstanding: ov.outstanding, repaid, ratio: ov.ratio, nextDue: ov.nextDue, overdueCount: ov.overdueCount, closedIn: ov.closedIn, payoffMonth };
      }),
    [loans, payments],
  );

  const outstandingTotal = rows.reduce((a, r) => a + r.outstanding, 0);
  const emiTotal = rows.reduce((a, r) => a + r.loan.emiPaise, 0);
  const borrowedTotal = rows.reduce((a, r) => a + r.loan.principalPaise, 0);
  const paidTotal = Math.max(0, borrowedTotal - outstandingTotal);
  const agg = useMemo(() => aggregateLoans(loans, payments), [loans, payments]);
  const nextDue = agg.nextDue;

  return (
    <Screen tabBar={false}>
      <ScreenHeader
        title="Loans & EMI"
        back
        right={
          <Button
            label="New"
            height={40}
            onPress={() => router.push('/loan-new')}
            icon={<Feather name="plus" size={15} color={colors.white} />}
            style={{ paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.ink }}
          />
        }
      />

      {/* Ink summary hero */}
      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color={colors.onInkMuted}>Outstanding balance</AppText>
            <Money paise={outstandingTotal} variant="display" color={colors.white} style={{ fontSize: 30 }} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <AppText variant="caption" color={colors.onInkMuted}>EMI / month</AppText>
            <Money paise={emiTotal} variant="subheading" color={colors.mint} />
          </View>
        </View>
        <ProgressBar ratio={borrowedTotal ? paidTotal / borrowedTotal : 0} color={colors.mint} track="rgba(255,255,255,0.15)" height={5} />
        {agg.overdue > 0 ? (
          <AppText variant="caption" color="#FF9C8F" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{agg.overdue} instalment{agg.overdue === 1 ? '' : 's'} overdue</AppText>
        ) : nextDue ? (
          <AppText variant="caption" color={colors.mint}>Next EMI {formatINR(nextDue.emi)} · {dueDayOf(loans.find((l) => l.id === nextDue.loanId)!)} {labelMonth(nextDue.month)}</AppText>
        ) : loans.length > 0 ? (
          <AppText variant="caption" color={colors.mint}>All loans paid off</AppText>
        ) : (
          <AppText variant="caption" color={colors.onInkMuted}>{formatINR(paidTotal)} repaid so far</AppText>
        )}
      </View>

      {rows.length === 0 ? (
        <Card style={{ alignItems: 'center', padding: 24, gap: 10 }}>
          <AppText color={colors.muted} variant="body">No loans yet. Add one to track the EMI, interest and progress.</AppText>
          <Button
            label="New loan"
            height={48}
            onPress={() => router.push('/loan-new')}
            icon={<Feather name="plus" size={16} color={colors.mint} />}
            style={{ paddingHorizontal: 20, borderRadius: 24 }}
          />
        </Card>
      ) : (
        rows.map(({ loan, outstanding, repaid, ratio, nextDue, overdueCount, closedIn, payoffMonth }) => {
          const status =
            outstanding <= 0
              ? { label: `Paid off${closedIn ? ` · ${labelMonth(closedIn)}` : ''}`, color: colors.savings }
              : overdueCount > 0
                ? { label: `${overdueCount} overdue`, color: colors.danger }
                : nextDue
                  ? { label: `Due ${dueDayOf(loan)} ${shortMonth(nextDue.month)}`, color: colors.muted }
                  : null;
          return (
            <Pressable
              key={loan.id}
              accessibilityRole="button"
              accessibilityLabel={`Loan ${loan.name}`}
              onPress={() => router.push({ pathname: '/loan/[id]', params: { id: loan.id } })}
            >
              <Card style={{ gap: 10, borderRadius: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.expenseTint, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={iconForLoan(loan.name)} size={21} color={colors.expense} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="subheading" numberOfLines={1} style={{ fontSize: 16 }}>{loan.name}</AppText>
                    <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }} numberOfLines={1}>{loan.annualRatePct}% p.a. · {loan.tenureMonths} months{payoffMonth ? ` · payoff ${labelMonth(payoffMonth)}` : ''}</AppText>
                  </View>
                  {status ? <AppText variant="caption" color={status.color} style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>{status.label}</AppText> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>OUTSTANDING</AppText>
                    <Money paise={outstanding} variant="subheading" style={{ fontSize: 19 }} />
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 1 }}>
                    <AppText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>EMI / MO</AppText>
                    <Money paise={loan.emiPaise} variant="subheading" />
                  </View>
                </View>
                <ProgressBar ratio={ratio} color={colors.savings} height={6} />
                <AppText variant="caption" color={colors.textSoft} style={{ fontSize: 11 }}>{formatINR(repaid)} repaid of {formatINR(loan.principalPaise)}</AppText>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
