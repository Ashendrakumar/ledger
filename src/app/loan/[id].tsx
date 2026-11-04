import { useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
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
import { useLoans } from '@/store/loans';
import { useEntries } from '@/store/entries';
import { getLoanOverview, dueDayOf } from '@/lib/emi';
import { formatINR, toPaise } from '@/lib/money';
import { labelMonth, todayISO } from '@/lib/dates';
import type { LoanScheduleRow, RowStatus } from '@/lib/emi';
import type { PaymentKind } from '@/types';

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SCHEDULE_PREVIEW = 26;

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
      <AppText variant="subheading" style={{ fontSize: 14 }}>{value}</AppText>
    </View>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, borderRadius: 18, padding: 12, gap: 2 }}>
      <AppText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>{label}</AppText>
      <AppText variant="subheading" style={{ fontSize: 15, color }} numberOfLines={1}>{value}</AppText>
    </View>
  );
}

type Tab = 'schedule' | 'payments';

export default function LoanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loans, payments, markPayment, removePayment, remove } = useLoans();
  const { add: addEntry, removeLoanPaymentEntries } = useEntries();
  const loan = loans.find((l) => l.id === id);

  const ov = useMemo(() => (loan ? getLoanOverview(loan, payments) : null), [loan, payments]);
  const emiDefault = loan ? String(loan.emiPaise / 100) : '';

  const [segment, setSegment] = useState<'actual' | 'planned'>('actual');
  const [amount, setAmount] = useState(emiDefault);
  const [date, setDate] = useState(todayISO());
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('schedule');
  const [showAll, setShowAll] = useState(false);

  if (!loan || !ov) {
    return (
      <Screen tabBar={false}>
        <ScreenHeader title="Loan" back />
        <AppText color={colors.muted}>Loan not found.</AppText>
      </Screen>
    );
  }

  const rows = ov.schedule;
  const next = ov.nextDue;
  const loanPayments = payments.filter((p) => p.loanId === loan.id).sort((a, b) => b.month.localeCompare(a.month) || (b.date ?? '').localeCompare(a.date ?? ''));
  const targetMonth = editingMonth ?? next?.month;
  const targetPayment = editingMonth ? payments.find((p) => p.loanId === loan.id && p.month === editingMonth) : undefined;
  const nextPayment = next ? payments.find((p) => p.loanId === loan.id && p.month === next.month) : undefined;
  const visible = showAll ? rows : rows.slice(0, SCHEDULE_PREVIEW);
  const interestPaid = rows.filter((r) => r.paid || r.closed).reduce((a, r) => a + r.interest, 0);
  const payoffMonth = ov.closedIn ?? rows[rows.length - 1]?.month;

  const startEdit = (r: LoanScheduleRow) => {
    const p = payments.find((x) => x.loanId === loan.id && x.month === r.month);
    setEditingMonth(r.month);
    setSegment(p?.kind === 'planned' ? 'planned' : 'actual');
    setAmount(p ? String(p.amountPaise / 100) : String(loan.emiPaise / 100));
    setDate(p?.date ?? todayISO());
    setTab('schedule');
  };

  const cancelEdit = () => {
    setEditingMonth(null);
    setSegment('actual');
    setAmount(emiDefault);
    setDate(todayISO());
  };

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

  const save = () => {
    const v = parseFloat(amount);
    const month = editingMonth ?? next?.month;
    if (!month || !(v > 0)) return;
    if (segment === 'actual' && !DATE_RE.test(date)) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
      return;
    }
    const paid = markPayment({ loanId: loan.id, month, amountPaise: toPaise(v), kind: segment, date: segment === 'actual' ? date : undefined });
    // Editing an existing payment replaces it — drop its ledger twin, then re-log if actual.
    if (targetPayment) removeLoanPaymentEntries([targetPayment.id]);
    if (paid.kind === 'actual') logExpenseFor(paid.id, paid.amountPaise, paid.month, paid.date);
    if (editingMonth) cancelEdit();
  };

  const delPayment = () => {
    if (!targetPayment || !editingMonth) return;
    Alert.alert('Delete this payment?', `${formatINR(targetPayment.amountPaise)} recorded for ${labelMonth(editingMonth)} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removePaymentAndExpense(targetPayment.id); cancelEdit(); } },
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
    <Screen tabBar={false}>
      <ScreenHeader title={loan.name} back subtitle={`${loan.annualRatePct}% p.a. · ${loan.tenureMonths} months`} right={<Button variant="outline" label="Edit" height={40} onPress={() => router.push({ pathname: '/loan-new', params: { id: loan.id } })} style={{ paddingHorizontal: 16, borderRadius: 20 }} />} />

      {/* Ink hero */}
      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color={colors.onInkMuted}>Loan outstanding</AppText>
            <Money paise={ov.outstanding} variant="display" color={colors.white} style={{ fontSize: 30 }} />
          </View>
          {next ? (
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
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

      {/* Record / edit payment */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="subheading">{editingMonth ? `Edit payment — ${labelMonth(editingMonth)}` : 'Record payment'}</AppText>
          {editingMonth ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Stop editing" onPress={cancelEdit} hitSlop={8}>
              <AppText variant="subheading" color={colors.primary}>Done</AppText>
            </Pressable>
          ) : null}
        </View>
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
              <TextInput
                accessibilityLabel="Payment date, year-month-day"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                maxLength={10}
                style={{ height: 48, borderRadius: 14, backgroundColor: colors.canvas, borderWidth: 1, borderColor: DATE_RE.test(date) ? colors.borderStrong : colors.danger, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text }}
              />
            </View>
          ) : null}
        </View>
        {targetMonth ? (
          <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Counts toward the {labelMonth(targetMonth)} installment{targetPayment ? ' · replaces the payment already recorded' : ''}{loan.trackExpenses && segment === 'actual' ? ' · logged as expense' : ''}</AppText>
        ) : (
          <AppText variant="caption" color={colors.savings}>This loan is fully repaid.</AppText>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {editingMonth && targetPayment ? (
            <View style={{ flex: 1 }}>
              <Button label="Delete" height={52} variant="danger" onPress={delPayment} />
            </View>
          ) : null}
          <View style={{ flex: 1.4 }}>
            <Button label={editingMonth ? 'Save changes' : 'Record payment'} height={52} disabled={!targetMonth || !parseFloat(amount)} onPress={save} />
          </View>
        </View>
        {!editingMonth && nextPayment ? (
          <Button label="Undo payment" height={44} variant="ghost" onPress={() => removePaymentAndExpense(nextPayment.id)} />
        ) : null}
      </Card>

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="PRINCIPAL PAID" value={formatINR(ov.repaid)} color={colors.savingsText} />
        <StatTile label="INTEREST PAID" value={formatINR(interestPaid)} color={colors.expenseText} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="INTEREST REMAINING" value={formatINR(ov.remainingInterest)} color={colors.expenseText} />
        <StatTile label="PAYOFF" value={payoffMonth ? labelMonth(payoffMonth) : '—'} color={colors.text} />
      </View>

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
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {visible.map((r, i) => {
            const meta = STATUS_META[r.status];
            return (
              <Pressable
                key={r.month}
                accessibilityRole="button"
                accessibilityLabel={`${labelMonth(r.month)} installment, ${meta.label}`}
                onPress={() => startEdit(r)}
                style={{ gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={meta.icon} size={16} color={meta.fg} />
                  </View>
                  <AppText variant="subheading" style={{ flex: 1 }}>{labelMonth(r.month)}</AppText>
                  <AppText variant="caption" color={meta.fg} style={{ fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold' }}>{meta.label.toUpperCase()}</AppText>
                  <Money paise={r.emi} variant="subheading" style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }} />
                </View>
                {r.status !== 'closed' ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 44 }}>
                    <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Interest {formatINR(r.interest)}</AppText>
                    <AppText variant="caption" color={colors.savings} style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>Principal {formatINR(r.principal)}</AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          {!showAll && rows.length > SCHEDULE_PREVIEW ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Show all installments" onPress={() => setShowAll(true)}
              style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border }}>
              <AppText variant="subheading" color={colors.primary}>Show all {rows.length} installments</AppText>
            </Pressable>
          ) : null}
        </Card>
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
                onPress={() => {
                  const r = rows.find((x) => x.month === p.month);
                  if (r && p.kind !== 'prepayment') startEdit(r);
                }}
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

      <Button label="Make prepayment" variant="outline" height={48} icon={<Feather name="zap" size={17} color={colors.primary} />} onPress={() => router.push({ pathname: '/loan-prepay', params: { id: loan.id } })} />
      <Button label="Delete loan" variant="danger" height={48} onPress={delLoan} />
    </Screen>
  );
}
