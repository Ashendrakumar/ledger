import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, font } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Sheet } from '@/components/ui/Sheet';
import { SheetActions } from '@/components/ui/SheetActions';
import { Card } from '@/components/ui/Card';
import { useLoans } from '@/store/loans';
import { useEntries } from '@/store/entries';
import { getLoanOverview } from '@/lib/emi';
import { formatINR, toPaise } from '@/lib/money';
import { labelMonth, todayISO } from '@/lib/dates';

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const monthIdx = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7));

export default function PrepayLoan() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { loans, payments, markPayment } = useLoans();
  const { add: addEntry } = useEntries();
  const loan = loans.find((l) => l.id === id);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  const ov = useMemo(() => (loan ? getLoanOverview(loan, payments) : null), [loan, payments]);
  const v = parseFloat(amount);
  const amountOk = Number.isFinite(v) && v > 0;
  const dateOk = DATE_RE.test(date);

  const sim = useMemo(() => {
    if (!loan || !ov || !amountOk || !dateOk) return null;
    const simPayments = [
      ...payments,
      { id: '__sim__', loanId: loan.id, month: date.slice(0, 7), amountPaise: toPaise(v), kind: 'prepayment' as const, date },
    ];
    const after = getLoanOverview(loan, simPayments);
    const basePayoffIdx = monthIdx(ov.closedIn ?? ov.schedule[ov.schedule.length - 1]?.month ?? loan.startMonth);    const simPayoffIdx = monthIdx(after.closedIn ?? after.schedule[after.schedule.length - 1]?.month ?? loan.startMonth);
    const monthsEarlier = Math.max(0, basePayoffIdx - simPayoffIdx);
    return {
      interestSaved: Math.max(0, ov.remainingInterest - after.remainingInterest),
      monthsEarlier,
      payoff: after.closedIn ?? after.schedule[after.schedule.length - 1]?.month,
    };
  }, [loan, ov, payments, amountOk, v, dateOk, date]);

  if (!loan || !ov) {
    return (
      <Screen tabBar={false}>
        <ScreenHeader title="Prepay" back />
        <AppText color={colors.muted}>Loan not found.</AppText>
      </Screen>
    );
  }

  const save = () => {
    if (!amountOk || !dateOk) return;
    const p = markPayment({
      loanId: loan.id,
      month: date.slice(0, 7),
      amountPaise: toPaise(v),
      kind: 'prepayment',
      date,
      note: note.trim() || undefined,
    });
    if (loan.trackExpenses) {
      addEntry({
        kind: 'actual',
        type: 'expense',
        amountPaise: p.amountPaise,
        category: 'Loan EMI',
        month: p.month,
        date,
        note: `${loan.name} — prepayment`,
        loanPaymentId: p.id,
      });
    }
    router.back();
  };

  const payoffBase = ov.closedIn ?? ov.schedule[ov.schedule.length - 1]?.month;

  return (
    <Sheet footer={<SheetActions primaryLabel="Record prepayment" onPrimary={save} disabled={!amountOk || !dateOk} />}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ gap: 16, flexShrink: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 8 }} style={{ flexShrink: 1 }}>
          <AppText variant="heading" style={{ fontSize: 22 }}>Prepay loan</AppText>
          <AppText variant="caption" color={colors.muted}>{loan.name} · {loan.annualRatePct}% p.a. · outstanding {formatINR(ov.outstanding)}</AppText>

          <View style={{ gap: 4 }}>
            <AppText variant="label" color={colors.muted}>PREPAY NOW</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <AppText variant="display" color={colors.expense} style={{ fontSize: 34 }}>₹</AppText>
              <TextInput
                accessibilityLabel="Prepayment amount in rupees"
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={colors.switchOff}
                keyboardType="decimal-pad"
                autoFocus
                style={{ flex: 1, fontFamily: font.extrabold, fontSize: 36, color: colors.expense, letterSpacing: -1, paddingVertical: 4 }}
              />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>PAYMENT DATE</AppText>
            <TextInput
              accessibilityLabel="Payment date, year-month-day"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              maxLength={10}
              style={{ height: 48, borderRadius: 14, backgroundColor: colors.canvas, borderWidth: 1, borderColor: dateOk ? colors.borderStrong : colors.danger, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>NOTE (OPTIONAL)</AppText>
            <TextInput
              accessibilityLabel="Note about this prepayment"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Annual bonus"
              placeholderTextColor={colors.muted}
              style={{ height: 48, borderRadius: 14, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text }}
            />
          </View>

          {sim && sim.interestSaved > 0 ? (
            <Card style={{ backgroundColor: colors.savingsTint, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Feather name="trending-down" size={22} color={colors.savings} />
              <View style={{ flex: 1, gap: 1 }}>
                <AppText variant="subheading" color={colors.savingsText}>Saves {formatINR(sim.interestSaved)} in interest</AppText>
                <AppText variant="caption" color={colors.savingsText} style={{ fontSize: 12 }}>
                  {sim.monthsEarlier > 0 ? `Loan closes ${sim.payoff ? labelMonth(sim.payoff) : ''} · ${sim.monthsEarlier} month${sim.monthsEarlier === 1 ? '' : 's'} earlier` : `Payoff unchanged at ${payoffBase ? labelMonth(payoffBase) : '—'}`}
                </AppText>
              </View>
            </Card>
          ) : (
            <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>
              {amountOk ? `Interest saved will appear here once the prepayment closes or shortens the loan.` : `Enter an amount to see how much interest you would save.`}
            </AppText>
          )}

          {loan.trackExpenses ? (
            <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>This prepayment will also be logged as an expense in your ledger.</AppText>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
