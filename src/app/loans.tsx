import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLoans } from '@/store/loans';
import { useEntries } from '@/store/entries';
import { getLoanOverview, aggregateLoans, dueDayOf } from '@/lib/emi';
import { formatINR } from '@/lib/money';
import { shortMonth, labelMonth } from '@/lib/dates';
import { SwipeActions } from '@/components/ui/SwipeActions';

const iconForLoan = (name: string): React.ComponentProps<typeof Feather>['name'] => {
  const n = name.toLowerCase();
  if (n.includes('car') || n.includes('vehicle') || n.includes('auto')) return 'truck';
  if (n.includes('home') || n.includes('house') || n.includes('mortgage')) return 'home';
  if (n.includes('education') || n.includes('study') || n.includes('student')) return 'book-open';
  if (n.includes('personal')) return 'user';
  return 'percent';
};

export default function Loans() {
  const { loans, payments, remove } = useLoans();
  const removeLoanPaymentEntries = useEntries((s) => s.removeLoanPaymentEntries);
  const [showCompleted, setShowCompleted] = useState(false);

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

  const activeRows = rows.filter((r) => r.outstanding > 0);
  const completedRows = rows.filter((r) => r.outstanding <= 0);
  const outstandingTotal = rows.reduce((a, r) => a + r.outstanding, 0);
  const emiTotal = activeRows.reduce((a, r) => a + r.loan.emiPaise, 0);
  const borrowedTotal = rows.reduce((a, r) => a + r.loan.principalPaise, 0);
  const paidTotal = Math.max(0, borrowedTotal - outstandingTotal);
  const agg = useMemo(() => aggregateLoans(loans, payments), [loans, payments]);
  const nextDue = agg.nextDue;

  const confirmDelete = (loan: (typeof loans)[number]) => {
    const paymentIds = payments.filter((payment) => payment.loanId === loan.id).map((payment) => payment.id);
    Alert.alert('Delete this loan?', `${loan.name} and its recorded payments will be removed. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        remove(loan.id);
        if (paymentIds.length) removeLoanPaymentEntries(paymentIds);
      } },
    ]);
  };

  const renderLoanCard = ({ loan, outstanding, repaid, ratio, nextDue, overdueCount, closedIn, payoffMonth }: (typeof rows)[number]) => {
    const status =
      outstanding <= 0
        ? { label: `Paid off${closedIn ? ` · ${labelMonth(closedIn)}` : ''}`, color: colors.savings }
        : overdueCount > 0
          ? { label: `${overdueCount} overdue`, color: colors.danger }
          : nextDue
            ? { label: `Due ${dueDayOf(loan)} ${shortMonth(nextDue.month)}`, color: colors.muted }
            : null;
  const actions = () => (
    <SwipeActions
      editLabel={`Edit loan ${loan.name}`}
      deleteLabel={`Delete loan ${loan.name}`}
      onEdit={() => router.push({ pathname: '/loan-new', params: { id: loan.id } })}
      onDelete={() => confirmDelete(loan)}
    />
  );
    return (
      <View key={loan.id} style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 6 }}>
      <ReanimatedSwipeable renderRightActions={actions} overshootRight={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Loan ${loan.name}`}
        onPress={() => router.push({ pathname: '/loan/[id]', params: { id: loan.id } })}
      >
        <Card style={{ gap: 10, borderRadius: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.expenseTint, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={iconForLoan(loan.name)} size={21} color={colors.expense} />
            </View>
            <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
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
      </ReanimatedSwipeable>
      </View>
    );
  };

  return (
    <Screen
      tabBar={false}
      header={
        <ScreenHeader
          title="Loans & EMI"
          back
          showProfile={false}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel="Add loan" onPress={() => router.push('/loan-new')}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="plus" size={19} color={colors.white} />
            </Pressable>
          }
        />
      }
    >

      {/* Ink summary hero */}
      {rows.length > 0 ? <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 8 }}>
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
      </View> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No loans yet"
          description="Add a loan to track its EMI, interest, and repayment progress."
          actionLabel="Add loan"
          onAction={() => router.push('/loan-new')}
        />
      ) : (
        <>
          {activeRows.map(renderLoanCard)}
          {completedRows.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showCompleted ? 'Hide completed loans' : 'Show completed loans'}
                onPress={() => setShowCompleted((v) => !v)}
                style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}
              >
                <AppText variant="subheading">Completed loans ({completedRows.length})</AppText>
                <Feather name={showCompleted ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </Pressable>
              {showCompleted ? completedRows.map(renderLoanCard) : null}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
