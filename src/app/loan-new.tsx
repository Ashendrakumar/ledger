import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, font } from '@/theme';
import { Sheet } from '@/components/ui/Sheet';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { useLoans } from '@/store/loans';
import { shiftMonth, monthKey } from '@/lib/dates';
import { toPaise } from '@/lib/money';
import { computeLoanTotals } from '@/lib/emi';

const field = { height: 52, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text } as const;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TENURES = [12, 24, 36, 48, 60, 84, 120, 180, 360];

export default function NewLoan() {
  const add = useLoans((s) => s.add);
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('36');
  const [startMonth, setStartMonth] = useState(shiftMonth(monthKey(new Date()), 1));

  const principalValue = parseFloat(principal);
  const rateValue = parseFloat(rate) || 0;
  const tenureValue = parseInt(tenure, 10) || 0;

  const totals = useMemo(
    () => computeLoanTotals(toPaise(principalValue || 0), rateValue, tenureValue),
    [principalValue, rateValue, tenureValue],
  );

  const monthOk = MONTH_RE.test(startMonth);
  const ok = name.trim().length > 0 && principalValue > 0 && rateValue >= 0 && tenureValue >= 1 && monthOk;

  const save = () => {
    add({ name: name.trim(), principalPaise: toPaise(principalValue), annualRatePct: rateValue, tenureMonths: tenureValue, startMonth });
    router.back();
  };

  return (
    <Sheet>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="heading" style={{ fontSize: 22 }}>New loan</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>LOAN NAME</AppText>
            <TextInput accessibilityLabel="Loan name" value={name} onChangeText={setName} placeholder="e.g. Home loan" placeholderTextColor={colors.muted} style={field} />
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="label" color={colors.muted}>QUICK PICK</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Home loan', 'Car loan', 'Personal loan', 'Education loan', 'Other'].map((c) => (
                <Chip key={c} label={c} selected={name === c} onPress={() => setName(c)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>PRINCIPAL</AppText>
            <TextInput accessibilityLabel="Loan amount in rupees" value={principal} onChangeText={(t) => setPrincipal(t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} placeholder="0" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={field} />
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>INTEREST RATE</AppText>
            <TextInput accessibilityLabel="Interest rate in percent per year" value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={field} />
            <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Per year, e.g. 8.75 for an 8.75% loan.</AppText>
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="label" color={colors.muted}>TENURE</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TENURES.map((t) => (
                <Chip key={t} label={`${t} mo`} selected={tenure === String(t)} onPress={() => setTenure(String(t))} />
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color={colors.muted}>START MONTH</AppText>
            <TextInput accessibilityLabel="Start month, year-month" value={startMonth} onChangeText={setStartMonth} placeholder="YYYY-MM" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" maxLength={7} style={[field, !monthOk && { borderColor: colors.danger }]} />
            <AppText variant="caption" color={monthOk ? colors.muted : colors.danger} style={{ fontSize: 12 }}>{monthOk ? 'Loan starts this month (YYYY-MM)' : 'Use the format YYYY-MM, for example 2027-03'}</AppText>
          </View>

          <Card style={{ backgroundColor: colors.ink, borderColor: 'transparent', gap: 10 }}>
            <AppText variant="caption" color={colors.onInkMuted}>ESTIMATED EMI</AppText>
            <Money paise={totals.emi} variant="display" color={colors.white} style={{ fontSize: 36 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="caption" color={colors.onInkMuted}>Total interest</AppText>
              <Money paise={totals.totalInterest} variant="subheading" color={colors.mint} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="caption" color={colors.onInkMuted}>Total payable</AppText>
              <Money paise={totals.totalPayable} variant="subheading" color={colors.mint} />
            </View>
          </Card>

          <Button label="Create loan" height={56} disabled={!ok} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
