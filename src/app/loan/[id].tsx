import { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, font, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Segmented } from '@/components/ui/Segmented';
import { DateField } from '@/components/ui/DateField';
import { LoanPaymentSheet } from '@/components/LoanPaymentSheet';
import { LoanForeclosureSheet } from '@/components/LoanForeclosureSheet';
import { useLoans } from '@/store/loans';
import { useEntries } from '@/store/entries';
import { getLoanOverview, dueDayOf } from '@/lib/emi';
import { formatINR, toPaise } from '@/lib/money';
import { labelMonth, todayISO } from '@/lib/dates';
import type { LoanScheduleRow, RowStatus } from '@/lib/emi';
import type { LoanPayment, PaymentKind } from '@/types';
import { useToast } from '@/components/ui/Toast';

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const STATUS_META: Record<RowStatus, { icon: React.ComponentProps<typeof Feather>['name']; fg: string; bg: string; label: string }> = {
  paid:     { icon: 'check',        fg: colors.savings, bg: colors.savingsTint, label: 'Paid' },
  planned:  { icon: 'calendar',     fg: colors.savings, bg: colors.savingsTint, label: 'Planned' },
  partial:  { icon: 'clock',        fg: colors.expense, bg: colors.expenseTint, label: 'Partial' },
  overdue:  { icon: 'alert-circle', fg: colors.danger,  bg: colors.expenseTint, label: 'Overdue' },
  due:      { icon: 'clock',        fg: colors.expense, bg: colors.expenseTint, label: 'Due' },
  upcoming: { icon: 'clock',        fg: colors.muted,   bg: colors.canvas,      label: 'Upcoming' },
  closed:   { icon: 'check-circle', fg: colors.muted,   bg: colors.canvas,      label: 'Closed' },
};

const KIND_META: Record<PaymentKind, { label: string; fg: string }> = {
  actual: { label: 'Actual', fg: colors.savings },
  planned: { label: 'Planned', fg: colors.muted },
  prepayment: { label: 'Prepayment', fg: colors.expense },
};

function FactRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: last ? 0 : 1, borderTopColor: colors.border }}>
      <AppText variant="body">{label}</AppText>
      <AppText variant="subheading">{value}</AppText>
    </View>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, borderRadius: 16, padding: 12, gap: 2 }}>
      <AppText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>{label}</AppText>
      <AppText variant="subheading" style={{ fontSize: 15, color }} numberOfLines={1}>{value}</AppText>
    </View>
  );
}

type Tab = 'schedule' | 'payments';

export default function LoanDetail() {
  const { showError } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loans, payments, markPayment, removePayment, remove } = useLoans();
  const { add: addEntry, removeLoanPaymentEntries } = useEntries();
  const loan = loans.find((l) => l.id === id);

  const ov = useMemo(() => (loan ? getLoanOverview(loan, payments) : null), [loan, payments]);
  const emiDefault = loan ? String(loan.emiPaise / 100) : '';

  const [segment, setSegment] = useState<'actual' | 'planned'>('actual');
  const [amount, setAmount] = useState(emiDefault);
  const [date, setDate] = useState(todayISO());
  const [sheetMonth, setSheetMonth] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('schedule');
  const [showForeclosure, setShowForeclosure] = useState(false);

  if (!loan || !ov) {
    return (
      <Screen tabBar={false} header={<ScreenHeader title="Loan" back />}>
        <AppText color={colors.muted}>Loan not found.</AppText>
      </Screen>
    );
  }

  const rows = ov.schedule;
  const next = ov.nextDue;
  const targetMonth = next?.month;
  const existing = sheetMonth ? payments.find((p) => p.loanId === loan.id && p.month === sheetMonth) : undefined;
  const loanPayments = payments.filter((p) => p.loanId === loan.id).sort((a, b) => b.month.localeCompare(a.month) || (b.date ?? '').localeCompare(a.date ?? ''));
  const interestPaid = rows.filter((r) => r.paid || r.closed).reduce((a, r) => a + r.interest, 0);
  const payoffMonth = ov.closedIn ?? rows[rows.length - 1]?.month;

  // Schedule sections for the virtualized list: Paid (closed/settled) and Upcoming (the rest).
  const sections: { title: string; data: LoanScheduleRow[] }[] = (() => {
    const paid = rows.filter((r) => r.status === 'paid' || r.status === 'closed');
    const rest = rows.filter((r) => r.status !== 'paid' && r.status !== 'closed');
    const out: { title: string; data: LoanScheduleRow[] }[] = [];
    if (paid.length) out.push({ title: `Paid · ${paid.length}`, data: paid });
    if (rest.length) out.push({ title: `Upcoming · ${rest.length}`, data: rest });
    return out;
  })();

  const logExpenseFor = (paymentId: string, amountPaise: number, month: string, payDate?: string) => {
    if (!loan.trackExpenses) return;
    addEntry({
      kind: 'actual',
      type: 'expense',
      amountPaise,
      category: 'Loan EMI',
      month,
      date: payDate ?? todayISO(),
      note: `${loan.name} — EMI`,
      loanPaymentId: paymentId,
    });
  };

  const removePaymentAndExpense = (paymentId: string) => {
    removePayment(paymentId);
    if (loan.trackExpenses) removeLoanPaymentEntries([paymentId]);
  };

  const recordNew = () => {
    const v = parseFloat(amount);
    const month = targetMonth;
    if (!month || !(v > 0)) return;
    if (segment === 'actual' && !DATE_RE.test(date)) {
      showError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    const paid = markPayment({ loanId: loan.id, month, amountPaise: toPaise(v), kind: segment, date: segment === 'actual' ? date : undefined });
    logExpenseFor(paid.id, paid.amountPaise, paid.month, paid.date);
  };

  const onSheetSave = (seg: PaymentKind, amt: string, payDate: string) => {
    const v = parseFloat(amt);
    const month = sheetMonth ?? next?.month;
    if (!month || !(v > 0)) return;
    if (seg === 'actual' && !DATE_RE.test(payDate)) {
      showError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    const paid = markPayment({ loanId: loan.id, month, amountPaise: toPaise(v), kind: seg, date: seg === 'actual' ? payDate : undefined });
    const twin = payments.find((x) => x.loanId === loan.id && x.month === month);
    if (twin) removeLoanPaymentEntries([twin.id]);
    if (paid.kind === 'actual') logExpenseFor(paid.id, paid.amountPaise, paid.month, paid.date);
    setSheetMonth(null);
  };

  const onSheetDelete = (p: LoanPayment) => {
    Alert.alert('Delete this payment?', `${formatINR(p.amountPaise)} recorded for ${labelMonth(p.month)} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removePaymentAndExpense(p.id); setSheetMonth(null); } },
    ]);
  };

  const delLoan = () => {
    const ids = payments.filter((p) => p.loanId === loan.id).map((p) => p.id);
    Alert.alert('Delete this loan?', `${loan.name} and its ${ids.length} recorded payment${ids.length === 1 ? '' : 's'} will be removed. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove(loan.id);
          if (ids.length) removeLoanPaymentEntries(ids);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen
      tabBar={false}
      header={<ScreenHeader title={loan.name} back subtitle={`${loan.annualRatePct}% p.a. · ${loan.tenureMonths} months`} right={<Button variant="outline" label="Edit" height={40} onPress={() => router.push({ pathname: '/loan-new', params: { id: loan.id } })} style={{ paddingHorizontal: 16, borderRadius: 20 }} />} />}
    >

      {/* Ink hero */}
      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color={colors.onInkMuted}>Loan outstanding</AppText>
            <Money paise={ov.outstanding} variant="display" color={colors.white} style={{ fontSize: 30 }} />
          </View>
          {next ? (
            <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
              <AppText variant="caption" color={colors.onInkMuted}>NEXT DUE</AppText>
              <AppText variant="subheading" color={colors.mint} style={{ fontSize: 16 }}>{dueDayOf(loan)} {labelMonth(next.month)}</AppText>
            </View>
          ) : null}
        </View>
        <ProgressBar ratio={ov.ratio} color={colors.mint} track="rgba(255,255,255,0.15)" height={6} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>{formatINR(ov.repaid)} paid of {formatINR(loan.principalPaise)}</AppText>
          <AppText variant="caption" color={colors.mint}>{Math.round(ov.ratio * 100)}%</AppText>
        </View>
      </View>

      {/* Stats summary */}
      <Card style={{ padding: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatTile label="PRINCIPAL PAID" value={formatINR(ov.repaid)} color={colors.savingsText} />
          <StatTile label="INTEREST PAID" value={formatINR(interestPaid)} color={colors.expenseText} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatTile label="INTEREST REMAINING" value={formatINR(ov.remainingInterest)} color={colors.expenseText} />
          <StatTile label="PAYOFF" value={payoffMonth ? labelMonth(payoffMonth) : '—'} color={colors.text} />
        </View>
      </Card>

      {/* Record payment card (new payments; row-tap on the schedule opens the sheet) */}
      <Card style={{ gap: 12 }}>
        <AppText variant="subheading">Record payment</AppText>
        <Segmented options={[{ value: 'actual', label: 'Actual' }, { value: 'planned', label: 'Planned' }]} value={segment} onChange={setSegment} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label" color={colors.muted} style={{ fontSize: 11 }}>AMOUNT</AppText>
            <TextInput
              accessibilityLabel="Payment amount in rupees"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.switchOff}
              keyboardType="decimal-pad"
              style={{ height: 48, borderRadius: 14, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text }}
            />
          </View>
          {segment === 'actual' ? (
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label" color={colors.muted} style={{ fontSize: 11 }}>DATE</AppText>
              <DateField value={date} onChange={setDate} accessibilityLabel="Choose payment date" invalid={!DATE_RE.test(date)} />
            </View>
          ) : null}
        </View>
        {targetMonth ? (
          <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Counts toward the {labelMonth(targetMonth)} installment{loan.trackExpenses && segment === 'actual' ? ' · logged as expense' : ''}</AppText>
        ) : (
          <AppText variant="caption" color={colors.savings}>This loan is fully repaid.</AppText>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1.4 }}>
            <Button label="Record payment" height={52} disabled={!parseFloat(amount)} onPress={recordNew} />
          </View>
        </View>
        {next ? (
          <Button
            label="Undo last payment"
            height={44}
            variant="ghost"
            onPress={() => {
              const p = payments.find((x) => x.loanId === loan.id && x.month === next.month);
              if (p) removePaymentAndExpense(p.id);
            }}
          />
        ) : null}
      </Card>

      {/* Loan facts */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <FactRow label="Principal borrowed" value={formatINR(loan.principalPaise)} />
        <FactRow label="Interest rate" value={`${loan.annualRatePct}% per year`} />
        <FactRow label="Tenure" value={`${loan.tenureMonths} months`} />
        <FactRow label="EMI" value={formatINR(loan.emiPaise)} />
        <FactRow label="Due day" value={`${dueDayOf(loan)} of every month`} last />
      </Card>

      {/* Schedule / payments tabs */}
      <Segmented options={[{ value: 'schedule', label: `Schedule` }, { value: 'payments', label: `Payments (${loanPayments.length})` }]} value={tab} onChange={setTab} />

      {tab === 'schedule' ? (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.month}
          renderItem={({ item, index }) => {
            const meta = STATUS_META[item.status];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${labelMonth(item.month)} installment, ${meta.label}`}
                onPress={() => setSheetMonth(item.month)}
                style={{ gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={meta.icon} size={16} color={meta.fg} />
                    </View>
                    <AppText variant="subheading" numberOfLines={1}>{labelMonth(item.month)}</AppText>
                    <AppText variant="caption" color={meta.fg} style={{ fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold' }}>{meta.label.toUpperCase()}</AppText>
                  </View>
                  <Money paise={item.emi} variant="subheading" style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }} />
                </View>
                {item.status !== 'closed' ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 44 }}>
                    <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Interest {formatINR(item.interest)}</AppText>
                    <AppText variant="caption" color={colors.savings} style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>Principal {formatINR(item.principal)}</AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.track, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText variant="caption" color={colors.muted} style={{ fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{title}</AppText>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={{ padding: 16 }}><AppText color={colors.muted}>This schedule is complete.</AppText></View>}
        />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {loanPayments.length === 0 ? (
            <View style={{ padding: 20 }}><AppText color={colors.muted}>No payments recorded yet.</AppText></View>
          ) : loanPayments.map((p, i) => {
            const k = KIND_META[p.kind];
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`Payment for ${labelMonth(p.month)}, ${k.label}, ${formatINR(p.amountPaise)}`}
                onPress={() => { if (p.kind !== 'prepayment') setSheetMonth(p.month); }}
                style={{ gap: 2, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="subheading">{labelMonth(p.month)}</AppText>
                    <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>{k.label}{p.date ? ` · ${p.date}` : ''}{p.note ? ` · ${p.note}` : ''}</AppText>
                  </View>
                  <Money paise={p.amountPaise} variant="subheading" color={p.kind === 'planned' ? colors.muted : colors.text} />
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}

      <LoanPaymentSheet
        key={sheetMonth}
        loan={loan}
        month={sheetMonth}
        existing={existing}
        onSave={onSheetSave}
        onDelete={onSheetDelete}
        onClose={() => setSheetMonth(null)}
      />

      {showForeclosure ? <LoanForeclosureSheet loan={loan} ov={ov} onClose={() => setShowForeclosure(false)} /> : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Make prepayment" style={{ flex: 1 }} variant="outline" height={48} icon={<Feather name="zap" size={17} color={colors.primary} />} onPress={() => router.push({ pathname: '/loan-prepay', params: { id: loan.id } })} />
        <Button label="Close early" variant="outline" height={48} onPress={() => setShowForeclosure(true)} />
      </View>
      <Button label="Delete loan" variant="danger" height={48} onPress={delLoan} />
    </Screen>
  );
}
