import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { colors, font } from '@/theme';
import { AppText } from './ui/AppText';
import { DateField } from './ui/DateField';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { Sheet } from './ui/Sheet';
import { labelMonth, todayISO } from '@/lib/dates';
import type { Loan, LoanPayment } from '@/types';

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Bottom sheet for recording or editing a payment against a loan installment. */
export function LoanPaymentSheet({
  loan,
  month,
  existing,
  onSave,
  onDelete,
  onClose,
}: {
  loan: Loan;
  month: string | null;
  existing?: LoanPayment;
  onSave: (segment: 'actual' | 'planned', amount: string, date: string) => void;
  onDelete?: (payment: LoanPayment) => void;
  onClose: () => void;
}) {
  // Initialize from the existing payment (or the EMI default) — the parent keys the
  // sheet by the open month so this mounts when the sheet opens.
  const [segment, setSegment] = useState<'actual' | 'planned'>(() => (existing?.kind === 'planned' ? 'planned' : 'actual'));
  const [amount, setAmount] = useState(() => (existing ? String(existing.amountPaise / 100) : String(loan.emiPaise / 100)));
  const [date, setDate] = useState(() => existing?.date ?? todayISO());

  if (!month) return null;

  const save = () => {
    const v = parseFloat(amount);
    if (!(v > 0)) {
      Alert.alert('Enter an amount');
      return;
    }
    if (segment === 'actual' && !DATE_RE.test(date)) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
      return;
    }
    onSave(segment, amount, date);
    onClose();
  };

  return (
    <Sheet style={{ gap: 12 }} onDismiss={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {existing ? (
            <View style={{ flex: 1 }}>
              <Button label="Delete" height={52} variant="danger" onPress={() => { onDelete?.(existing); onClose(); }} />
            </View>
          ) : null}
          <View style={{ flex: 1.4 }}>
            <Button label={existing ? 'Save changes' : 'Record payment'} height={52} disabled={!parseFloat(amount)} onPress={save} />
          </View>
        </View>
      }>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="subheading">{existing ? `Edit payment — ${labelMonth(month)}` : `Record payment — ${labelMonth(month)}`}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Stop editing" onPress={onClose} hitSlop={8}>
          <AppText variant="subheading" color={colors.primary}>Done</AppText>
        </Pressable>
      </View>
      <Segmented options={[{ value: 'actual', label: 'Actual' }, { value: 'planned', label: 'Planned' }]} value={segment} onChange={setSegment} />
      <View style={{ gap: 2 }}>
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
        <View style={{ gap: 2 }}>
          <AppText variant="label" color={colors.muted} style={{ fontSize: 11 }}>DATE</AppText>
          <DateField value={date} onChange={setDate} accessibilityLabel="Choose payment date" invalid={!DATE_RE.test(date)} />
        </View>
      ) : null}
      <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Counts toward the {labelMonth(month)} installment{existing ? ' · replaces the payment already recorded' : ''}</AppText>
    </Sheet>
  );
}
