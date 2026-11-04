import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, font } from '@/theme';
import { Sheet } from '@/components/ui/Sheet';
import { SheetActions } from '@/components/ui/SheetActions';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { Toggle } from '@/components/ui/Toggle';
import { useLoans } from '@/store/loans';
import { shiftMonth, monthKey } from '@/lib/dates';
import { toPaise } from '@/lib/money';
import { computeLoanTotals } from '@/lib/emi';

const field = { height: 52, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text } as const;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TENURES = [12, 24, 36, 48, 60, 84, 120, 180, 360];

export default function NewLoan() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { loans, add, updateLoan, remove, payments } = useLoans();
  const editing = useMemo(() => (id ? loans.find((l) => l.id === id) : undefined), [loans, id]);

  const [name, setName] = useState(editing?.name ?? '');
  const [principal, setPrincipal] = useState(editing ? String(editing.principalPaise / 100) : '');
  const [rate, setRate] = useState(editing ? String(editing.annualRatePct) : '');
  const [tenure, setTenure] = useState(editing ? String(editing.tenureMonths) : '36');
  const [startMonth, setStartMonth] = useState(editing?.startMonth ?? shiftMonth(monthKey(new Date()), 1));
  const [dueDay, setDueDay] = useState(editing ? String(editing.dueDay ?? 5) : '5');
  const [trackExpenses, setTrackExpenses] = useState(editing?.trackExpenses ?? true);

  const principalValue = parseFloat(principal);
  const rateValue = parseFloat(rate) || 0;
  const tenureValue = parseInt(tenure, 10) || 0;
  const dueDayValue = parseInt(dueDay, 10);
  const dueDayOk = Number.isInteger(dueDayValue) && dueDayValue >= 1 && dueDayValue <= 31;

  const totals = useMemo(
    () => computeLoanTotals(toPaise(principalValue || 0), rateValue, tenureValue),
    [principalValue, rateValue, tenureValue],
  );

  const monthOk = MONTH_RE.test(startMonth);
  const ok = name.trim().length > 0 && principalValue > 0 && rateValue >= 0 && tenureValue >= 1 && monthOk && dueDayOk;

  const save = () => {
    if (!ok) return;
    const data = { name: name.trim(), principalPaise: toPaise(principalValue), annualRatePct: rateValue, tenureMonths: tenureValue, startMonth, dueDay: dueDayValue, trackExpenses };
    if (editing) {
      updateLoan(editing.id, data);
      router.back();
    } else {
      const loan = add(data);
      // Land on the fresh loan's detail so the new EMI / outstanding / schedule are visible.
      router.replace({ pathname: '/loan/[id]', params: { id: loan.id } });
    }
  };

  const del = () => {
    if (!editing) return;
    const n = payments.filter((p) => p.loanId === editing.id).length;
    Alert.alert('Delete this loan?', `${editing.name} and its ${n} recorded payment${n === 1 ? '' : 's'} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { remove(editing.id); router.back(); } },
    ]);
  };

  return (
    <Sheet footer={<SheetActions primaryLabel={editing ? 'Save changes' : 'Add loan'} onPrimary={save} disabled={!ok} />}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }} style={{ flex: 1, flexShrink: 1 }}>
          <AppText variant="heading" style={{ fontSize: 22 }}>{editing ? 'Edit loan' : 'Add loan'}</AppText>

          <View style={{ gap: 8 }}>
            <AppText variant="label" color={colors.muted}>QUICK PICK</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Home loan', 'Car loan', 'Personal loan', 'Education loan', 'Other'].map((c) => (
                <Chip key={c} label={c} selected={name === c} onPress={() => setName(c)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>LOAN NAME</AppText>
            <TextInput accessibilityLabel="Loan name" value={name} onChangeText={setName} placeholder="e.g. Home loan" placeholderTextColor={colors.muted} style={field} />
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>LOAN AMOUNT</AppText>
            <TextInput accessibilityLabel="Loan amount in rupees" value={principal} onChangeText={(t) => setPrincipal(t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} placeholder="0" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={field} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="label" color={colors.muted}>INTEREST RATE</AppText>
              <TextInput accessibilityLabel="Interest rate in percent per year" value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={field} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="label" color={colors.muted}>TENURE (MONTHS)</AppText>
              <TextInput accessibilityLabel="Tenure in months" value={tenure} onChangeText={(t) => setTenure(t.replace(/[^0-9]/g, '').slice(0, 3))} placeholder="Months" placeholderTextColor={colors.muted} keyboardType="number-pad" style={field} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TENURES.map((t) => (
              <Chip key={t} label={`${t} mo`} selected={tenure === String(t)} onPress={() => setTenure(String(t))} />
            ))}
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="label" color={colors.muted}>EMI DUE DAY</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {[1, 5, 10, 15, 28].map((d) => (
                <Chip key={d} label={String(d)} selected={dueDay === String(d)} onPress={() => setDueDay(String(d))} />
              ))}
              <TextInput accessibilityLabel="EMI due day, 1 to 31" value={dueDay} onChangeText={(t) => setDueDay(t.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="Day" placeholderTextColor={colors.muted} keyboardType="number-pad" style={[field, { width: 72, textAlign: 'center' }, !dueDayOk && { borderColor: colors.danger }]} />
            </View>
            <AppText variant="caption" color={dueDayOk ? colors.muted : colors.danger} style={{ fontSize: 12 }}>{dueDayOk ? 'Day of the month the EMI falls due (1–31).' : 'Enter a day between 1 and 31.'}</AppText>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>START MONTH</AppText>
            <TextInput accessibilityLabel="Start month, year-month" value={startMonth} onChangeText={setStartMonth} placeholder="YYYY-MM" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" maxLength={7} style={[field, !monthOk && { borderColor: colors.danger }]} />
            <AppText variant="caption" color={monthOk ? colors.muted : colors.danger} style={{ fontSize: 12 }}>{monthOk ? 'Loan starts this month (YYYY-MM)' : 'Use the format YYYY-MM, for example 2027-03'}</AppText>
          </View>

          {/* Live estimate */}
          <Card style={{ backgroundColor: colors.ink, borderColor: 'transparent', gap: 8 }}>
            <AppText variant="caption" color={colors.onInkMuted}>ESTIMATED EMI</AppText>
            <Money paise={totals.emi} variant="display" color={colors.white} style={{ fontSize: 34 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 8 }}>
              <AppText variant="caption" color={colors.onInkMuted}>Total interest</AppText>
              <Money paise={totals.totalInterest} variant="subheading" color={colors.mint} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 8 }}>
              <AppText variant="caption" color={colors.onInkMuted}>Total payable</AppText>
              <Money paise={totals.totalPayable} variant="subheading" color={colors.mint} />
            </View>
          </Card>

          {/* Track EMI payments as expenses in the ledger */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="body">Add payments to my expenses</AppText>
              <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Actual EMI payments are logged as expenses in this month.</AppText>
            </View>
            <Toggle label="Add payments to expenses" value={trackExpenses} onValueChange={setTrackExpenses} />
          </View>

          {editing ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Delete loan" onPress={del} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="subheading" color={colors.danger}>Delete loan</AppText>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
