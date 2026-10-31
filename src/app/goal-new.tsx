import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, font } from '@/theme';
import { Sheet } from '@/components/ui/Sheet';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useGoals } from '@/store/goals';
import { shiftMonth, monthKey } from '@/lib/dates';
import { toPaise } from '@/lib/money';

const field = { height: 52, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text } as const;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function NewGoal() {
  const add = useGoals((s) => s.add);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [month, setMonth] = useState(shiftMonth(monthKey(new Date()), 6));
  const amount = parseFloat(target);
  const monthOk = MONTH_RE.test(month);
  const ok = name.trim().length > 0 && amount > 0 && monthOk;

  return (
    <Sheet>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="heading" style={{ fontSize: 22 }}>New goal</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
        </View>
        <TextInput accessibilityLabel="Goal name" value={name} onChangeText={setName} placeholder="Goal name, e.g. New phone" placeholderTextColor={colors.muted} style={field} />
        <TextInput accessibilityLabel="Target amount in rupees" value={target} onChangeText={(t) => setTarget(t.replace(/[^0-9.]/g, ''))} placeholder="Target amount (₹)" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={field} />
        <View style={{ gap: 6 }}>
          <TextInput accessibilityLabel="Target month, year-month" value={month} onChangeText={setMonth} placeholder="YYYY-MM" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" maxLength={7} style={[field, !monthOk && { borderColor: colors.danger }]} />
          <AppText variant="caption" color={monthOk ? colors.muted : colors.danger} style={{ fontSize: 12 }}>{monthOk ? 'Target month (YYYY-MM)' : 'Use the format YYYY-MM, for example 2027-03'}</AppText>
        </View>
        <Button label="Create goal" height={56} disabled={!ok} onPress={() => { add({ name: name.trim(), targetPaise: toPaise(amount), targetMonth: month }); router.back(); }} />
      </KeyboardAvoidingView>
    </Sheet>
  );
}
