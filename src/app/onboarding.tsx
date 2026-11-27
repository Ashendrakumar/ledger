import { useMemo, useState } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/store/auth';
import { useEntries } from '@/store/entries';
import { formatINR, toPaise } from '@/lib/money';
import { fullMonth } from '@/lib/dates';
import type { Entry } from '@/types';

const LINES = [
  { name: 'Rent & home', category: 'Rent', share: 0.28, icon: 'home' as const },
  { name: 'Food & groceries', category: 'Food', share: 0.18, icon: 'coffee' as const },
  { name: 'Travel & transport', category: 'Transport', share: 0.08, icon: 'truck' as const },
  { name: 'Bills & recharge', category: 'Bills', share: 0.07, icon: 'zap' as const },
  { name: 'Health', category: 'Health', share: 0.05, icon: 'heart' as const },
  { name: 'Shopping & personal', category: 'Shopping', share: 0.08, icon: 'shopping-bag' as const },
  { name: 'Emergency fund', category: 'Emergency fund', share: 0.10, type: 'saving' as const, icon: 'shield' as const },
  { name: 'Other', category: 'Other', share: 0.04, icon: 'more-horizontal' as const },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const completeSetup = useAuth((s) => s.completeSetup);
  const addMany = useEntries((s) => s.addMany);
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState('');
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [amounts, setAmounts] = useState<number[]>([]);
  const amount = Number(income.replace(/[^\d]/g, '')) || 0;
  const month = new Date().toISOString().slice(0, 7);
  const needs = useMemo(() => amounts.reduce((sum, v) => sum + v, 0), [amounts]);

  const suggest = () => setAmounts(LINES.map((line) => Math.round(amount * line.share)));
  const finishSetup = (created: Entry[]) => {
    void completeSetup(created).catch(() => {});
    router.replace('/(tabs)');
  };
  const finish = () => {
    const rows = LINES.map((line, i) => ({ kind: 'planned' as const, type: line.type ?? 'expense' as const, amountPaise: toPaise(amounts[i] ?? 0), category: line.category, month }));
    const created = addMany([...rows, { kind: 'planned', type: 'income', amountPaise: toPaise(amount), category: 'Salary', month }]);
    finishSetup(created);
  };
  const skipPlan = () => finishSetup([]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
    <Screen tabBar={false} contentContainerStyle={{ paddingBottom: step === 2 ? Math.max(insets.bottom, 16) + 76 : Math.max(insets.bottom, 24) + 16 }}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {[1, 2, 3].map((n) => <View key={n} style={{ height: 5, flex: 1, borderRadius: 5, backgroundColor: n <= step ? colors.primary : colors.track }} />)}
        </View>
        <AppText variant="caption" color={colors.muted}>Step {step} of 3 · Set up your monthly plan</AppText>
        <AppText variant="title">{step === 1 ? 'What’s your monthly income?' : step === 2 ? 'Your suggested plan' : 'Adjust a line'}</AppText>
        <AppText color={colors.muted} style={{ lineHeight: 21 }}>{step === 1 ? 'We’ll build a starting plan for your month. You can change it anytime.' : step === 2 ? 'A balanced starting point based on your income. Tap any line to change it.' : 'Make the plan fit your life. Your changes are saved for this month.'}</AppText>
      </View>

      {step === 1 ? <View style={{ marginTop: 24, gap: 14 }}>
        <Card style={{ borderColor: colors.primary, borderWidth: 1.5, gap: 8 }}>
          <AppText variant="caption" color={colors.muted}>Monthly take-home salary</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><AppText variant="heading" style={{ fontSize: 26 }}>₹</AppText><TextInput accessibilityLabel="Monthly income in rupees" value={income} onChangeText={(v) => setIncome(v.replace(/[^\d]/g, '').slice(0, 9))} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: font.extrabold, fontSize: 28, color: colors.text, padding: 0 }} /></View>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>{[25000, 35000, 50000, 75000].map((v) => <Pressable key={v} onPress={() => setIncome(String(v))} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 12 }}><AppText variant="caption">₹{(v / 1000).toFixed(0)},000</AppText></Pressable>)}</View>
        <View style={{ marginTop: 8 }}><Button label="Build my plan" disabled={amount <= 0} onPress={() => { Keyboard.dismiss(); suggest(); setStep(2); }} icon={<Feather name="arrow-right" size={18} color={colors.mint} />} /></View>
      </View> : null}

      {step === 2 ? <View style={{ gap: 12, marginTop: 20 }}>
        <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="caption" color={colors.onInkMuted}>Monthly income</AppText><AppText variant="heading" color={colors.mint}>{formatINR(toPaise(amount))}</AppText></View>
          <ProgressBar ratio={Math.min(1, needs / Math.max(amount, 1))} color={colors.mint} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="caption" color={colors.onInkMuted}>Needs {Math.round((needs / Math.max(amount, 1)) * 100)}%</AppText><AppText variant="caption" color={colors.onInkMuted}>Plan total {formatINR(toPaise(needs))}</AppText></View>
        </Card>
        {LINES.map((line, i) => <Pressable key={line.category} onPress={() => { setAdjusting(i); setStep(3); }} style={{ minHeight: 62, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.incomeTint, alignItems: 'center', justifyContent: 'center' }}><Feather name={line.icon} size={16} color={colors.income} /></View>
          <View style={{ flex: 1 }}><AppText variant="subheading">{line.name}</AppText><View style={{ marginTop: 5 }}><ProgressBar ratio={Math.min(1, (amounts[i] ?? 0) / Math.max(amount, 1))} color={line.type ? colors.savings : colors.expense} /></View></View>
          <View style={{ alignItems: 'flex-end' }}><AppText variant="subheading">{formatINR(toPaise(amounts[i] ?? 0))}</AppText><AppText variant="caption" color={colors.muted}>{Math.round(((amounts[i] ?? 0) / Math.max(amount, 1)) * 100)}%</AppText></View><Feather name="chevron-right" size={16} color={colors.muted} />
        </Pressable>)}
        <AppText variant="caption" color={colors.muted}>Suggested for {fullMonth(month)} · You can edit the plan anytime.</AppText>
      </View> : null}

      {step === 3 && adjusting !== null ? <View style={{ marginTop: 24, gap: 18 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to suggested plan" onPress={() => setStep(2)}
          style={{ alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="chevron-left" size={20} color={colors.primary} />
          <AppText variant="subheading" color={colors.primary}>Back to plan</AppText>
        </Pressable>
        <Card style={{ gap: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Feather name={LINES[adjusting].icon} size={18} color={colors.primary} /><AppText variant="heading">{LINES[adjusting].name}</AppText></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable accessibilityLabel="Decrease amount" onPress={() => setAmounts((prev) => prev.map((v, i) => i === adjusting ? Math.max(0, v - 500) : v))} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Feather name="minus" size={18} color={colors.primary} /></Pressable>
            <TextInput accessibilityLabel={`${LINES[adjusting].name} amount in rupees`} value={String(amounts[adjusting] ?? 0)} onChangeText={(v) => setAmounts((prev) => prev.map((n, i) => i === adjusting ? (Number(v.replace(/[^\d]/g, '')) || 0) : n))} keyboardType="number-pad" style={{ fontFamily: font.extrabold, fontSize: 26, color: colors.text, textAlign: 'center', minWidth: 140 }} />
            <Pressable accessibilityLabel="Increase amount" onPress={() => setAmounts((prev) => prev.map((v, i) => i === adjusting ? v + 500 : v))} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Feather name="plus" size={18} color={colors.primary} /></Pressable>
          </View>
          <ProgressBar ratio={Math.min(1, (amounts[adjusting] ?? 0) / Math.max(amount, 1))} color={colors.primary} />
          <AppText variant="caption" color={colors.muted}>About {Math.round(((amounts[adjusting] ?? 0) / Math.max(amount, 1)) * 100)}% of your monthly income</AppText>
        </Card>
        <Button label="Save amount" onPress={() => setStep(2)} />
      </View> : null}
    </Screen>
    {step === 2 ? (
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.canvas }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="outline" label="Skip plan" onPress={skipPlan} style={{ flex: 1 }} />
          <Button label="Save my plan" onPress={finish} style={{ flex: 1 }} />
        </View>
      </View>
    ) : null}
    </View>
  );
}
