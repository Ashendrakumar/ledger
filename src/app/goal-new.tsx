import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, font } from '@/theme';
import { Sheet } from '@/components/ui/Sheet';
import { SheetActions } from '@/components/ui/SheetActions';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useGoals } from '@/store/goals';
import { shiftMonth, monthKey } from '@/lib/dates';
import { toPaise } from '@/lib/money';

const field = { height: 52, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text } as const;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const NUM_RE = /^\d+(\.\d{1,2})?$/;

export default function NewGoal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goals = useGoals((s) => s.goals);
  const add = useGoals((s) => s.add);
  const update = useGoals((s) => s.update);
  const remove = useGoals((s) => s.remove);

  const editing = useMemo(() => (id ? goals.find((g) => g.id === id) : undefined), [goals, id]);
  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing ? String(editing.targetPaise / 100) : '');
  const [month, setMonth] = useState(editing?.targetMonth ?? shiftMonth(monthKey(new Date()), 6));
  const [saved, setSaved] = useState(editing ? String(editing.savedPaise / 100) : '');

  const amount = parseFloat(target);
  const savedAmount = saved.trim() === '' ? 0 : parseFloat(saved);
  const monthOk = MONTH_RE.test(month);
  const savedOk = NUM_RE.test(saved.trim()) || saved.trim() === '';
  const ok = name.trim().length > 0 && amount > 0 && monthOk && savedOk;

  const save = () => {
    if (!ok) return;
    if (editing) {
      update(editing.id, {
        name: name.trim(),
        targetPaise: toPaise(amount),
        targetMonth: month,
        savedPaise: toPaise(Math.max(0, savedAmount || 0)),
      });
    } else {
      add({ name: name.trim(), targetPaise: toPaise(amount), targetMonth: month });
    }
    router.back();
  };

  const del = () => {
    if (!editing) return;
    Alert.alert('Delete this goal?', `"${editing.name}" and its progress will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { remove(editing.id); router.back(); } },
    ]);
  };

  return (
    <Sheet
      footer={<SheetActions primaryLabel={editing ? 'Save changes' : 'Create goal'} onPrimary={save} disabled={!ok} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flexShrink: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
            <AppText variant="heading" style={{ fontSize: 22 }}>{editing ? 'Edit goal' : 'New goal'}</AppText>
            <TextInput accessibilityLabel="Goal name" value={name} onChangeText={setName} placeholder="Goal name, e.g. New phone" placeholderTextColor={colors.muted} style={field} />
            <TextInput accessibilityLabel="Target amount in rupees" value={target} onChangeText={(t) => setTarget(t.replace(/[^0-9.]/g, ''))} placeholder="Target amount (₹)" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={field} />
            {editing ? (
              <View style={{ gap: 6 }}>
                <TextInput accessibilityLabel="Saved so far in rupees" value={saved} onChangeText={(t) => setSaved(t.replace(/[^0-9.]/g, ''))} placeholder="Saved so far (₹)" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[field, !savedOk && { borderColor: colors.danger }]} />
                <AppText variant="caption" color={savedOk ? colors.muted : colors.danger} style={{ fontSize: 12 }}>{savedOk ? 'Amount saved toward this goal so far' : 'Enter a valid amount, for example 12500'}</AppText>
              </View>
            ) : null}
            <View style={{ gap: 6 }}>
              <TextInput accessibilityLabel="Target month, year-month" value={month} onChangeText={setMonth} placeholder="YYYY-MM" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" maxLength={7} style={[field, !monthOk && { borderColor: colors.danger }]} />
              <AppText variant="caption" color={monthOk ? colors.muted : colors.danger} style={{ fontSize: 12 }}>{monthOk ? 'Target month (YYYY-MM)' : 'Use the format YYYY-MM, for example 2027-03'}</AppText>
            </View>
            {editing ? <Button label="Delete goal" variant="danger" height={48} onPress={del} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
