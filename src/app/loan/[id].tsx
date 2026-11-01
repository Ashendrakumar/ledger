import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLoans } from '@/store/loans';
import { buildSchedule, computeLoanTotals, repaidRatio } from '@/lib/emi';
import { formatINR, toPaise } from '@/lib/money';
import { labelMonth, todayISO } from '@/lib/dates';
import type { LoanScheduleRow } from '@/lib/emi';

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: last ? 0 : 1, borderTopColor: colors.border }}>
      <AppText variant="body">{label}</AppText>
      <AppText variant="subheading" style={{ fontSize: 14 }}>{value}</AppText>
    </View>
  );
}

export default function LoanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loans, payments, markPayment, removePayment } = useLoans();
  const loan = loans.find((l) => l.id === id);
  const emiDefault = loan ? String(loan.emiPaise / 100) : '';
  const [actualAmt, setActualAmt] = useState(emiDefault);
  const rows = useMemo(() => (loan ? buildSchedule(loan, payments) : []), [loan, payments]);
  const totals = useMemo(() => (loan ? computeLoanTotals(loan.principalPaise, loan.annualRatePct, loan.tenureMonths) : null), [loan]);

  const outstanding = loan ? (rows.length ? rows[rows.length - 1].balanceAfter : loan.principalPaise) : 0;
  const repaid = loan ? Math.max(0, loan.principalPaise - outstanding) : 0;
  const ratio = loan ? repaidRatio(loan, payments) : 0;
  const next = rows.find((r) => !r.paid);
  const payment = next && loan ? payments.find((p) => p.loanId === loan.id && p.month === next.month) : undefined;

  if (!loan) {
    return (
      <Screen tabBar={false}>
        <ScreenHeader title="Loan" back />
        <AppText color={colors.muted}>Loan not found.</AppText>
      </Screen>
    );
  }

  const markPlanned = () => {
    if (!next) return;
    markPayment({ loanId: loan.id, month: next.month, amountPaise: next.emi, kind: 'planned' });
    setActualAmt(emiDefault);
  };

  const saveActual = () => {
    const v = parseFloat(actualAmt);
    if (!(v > 0) || !next) return;
    markPayment({ loanId: loan.id, month: next.month, amountPaise: toPaise(v), kind: 'actual', date: todayISO() });
  };

  const undo = () => {
    if (payment) removePayment(payment.id);
  };

  return (
    <Screen tabBar={false}>
      <ScreenHeader title={loan.name} back subtitle={`${loan.annualRatePct}% p.a. · ${loan.tenureMonths} months`} />

      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 12 }}>
        <AppText variant="caption" color={colors.onInkMuted}>Outstanding balance</AppText>
        <Money paise={outstanding} variant="display" color={colors.white} style={{ fontSize: 32 }} />
        <ProgressBar ratio={ratio} color={colors.mint} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>EMI</AppText>
          <Money paise={loan.emiPaise} variant="subheading" color={colors.mint} />
        </View>
      </View>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <DetailRow label="Principal borrowed" value={formatINR(loan.principalPaise)} />
        <DetailRow label="Interest rate" value={`${loan.annualRatePct}% per year`} />
        <DetailRow label="Tenure" value={`${loan.tenureMonths} months`} />
        <DetailRow label="EMI" value={formatINR(loan.emiPaise)} />
        <DetailRow label="Total interest payable" value={formatINR(totals?.totalInterest ?? 0)} />
        <DetailRow label="Total repaid" value={formatINR(repaid)} last />
      </Card>

      <Card style={{ gap: 12 }}>
        <AppText variant="subheading">Next payment</AppText>
        {next ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="body">{labelMonth(next.month)}</AppText>
              <Money paise={next.emi} variant="subheading" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="caption" color={colors.muted}>Interest portion</AppText>
              <AppText variant="caption" color={colors.textSoft}>{formatINR(next.interest)}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="caption" color={colors.muted}>Principal portion</AppText>
              <AppText variant="caption" color={colors.savings}>{formatINR(next.principal)}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="caption" color={colors.muted}>Balance before</AppText>
              <AppText variant="caption" color={colors.textSoft}>{formatINR(next.balanceBefore)}</AppText>
            </View>
            {payment ? (
              <AppText variant="caption" color={colors.textSoft}>
                Paid {formatINR(payment.amountPaise)} via {payment.kind}
                {payment.date ? ` · ${payment.date}` : ''}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button label="Mark as paid" height={48} disabled={!!payment} onPress={markPlanned} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Save actual" height={48} variant="outline" onPress={saveActual} />
              </View>
            </View>
            {payment ? (
              <Button label="Undo payment" height={44} variant="ghost" onPress={undo} />
            ) : null}
            <View style={{ gap: 6 }}>
              <TextInput
                accessibilityLabel="Actual payment amount in rupees"
                value={actualAmt}
                onChangeText={(t) => setActualAmt(t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                keyboardType="decimal-pad"
                style={{ height: 48, borderRadius: 14, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: colors.text }}
              />
              <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Amount actually paid for this month. Defaults to the EMI.</AppText>
            </View>
          </>
        ) : (
          <AppText color={colors.savings}>This loan is fully repaid. 🎉</AppText>
        )}
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.canvas, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <AppText variant="subheading">Repayment schedule</AppText>
        </View>
        {rows.map((r: LoanScheduleRow, i: number) => (
          <View key={`${r.month}-${i}`} style={{ gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: r.paid ? colors.savingsTint : colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={r.paid ? 'check' : 'clock'} size={16} color={r.paid ? colors.savings : colors.muted} />
              </View>
              <AppText variant="subheading" style={{ flex: 1 }}>{labelMonth(r.month)}</AppText>
              <Money paise={r.emi} variant="subheading" style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Interest {formatINR(r.interest)}</AppText>
              <AppText variant="caption" color={colors.savings} style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>Principal {formatINR(r.principal)}</AppText>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
