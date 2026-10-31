import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, font } from '@/theme';
import { Sheet } from '@/components/ui/Sheet';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Segmented } from '@/components/ui/Segmented';
import { TYPE_STYLE } from '@/components/EntryRow';
import { useEntries } from '@/store/entries';
import { useUi } from '@/store/ui';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { monthKey, todayISO } from '@/lib/dates';
import { toPaise } from '@/lib/money';
import type { EntryType, Kind } from '@/types';

const TYPES: { value: EntryType; label: string }[] = [
  { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'saving', label: 'Savings' },
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const field = { height: 52, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.text } as const;

export default function AddEntry() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { entries, add, update, remove } = useEntries();
  const month = useUi((s) => s.month);
  const editing = useMemo(() => entries.find((e) => e.id === id), [entries, id]);

  const [kind, setKind] = useState<Kind>(editing?.kind ?? 'actual');
  const [type, setType] = useState<EntryType>(editing?.type ?? 'expense');
  const [amount, setAmount] = useState(editing ? String(editing.amountPaise / 100) : '');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [newCat, setNewCat] = useState('');
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? '');

  const cats = useMemo(() => {
    const used = entries.filter((e) => e.type === type).map((e) => e.category);
    return [...new Set([...DEFAULT_CATEGORIES[type], ...used, ...(category ? [category] : [])])];
  }, [entries, type, category]);

  const value = parseFloat(amount);
  const dateOk = kind === 'planned' || DATE_RE.test(date);
  const canSave = value > 0 && !!category && dateOk;
  const tone = TYPE_STYLE[type];

  const save = () => {
    const entryMonth = kind === 'actual' ? date.slice(0, 7) : editing?.month ?? month;
    const data = { kind, type, amountPaise: toPaise(value), category, month: entryMonth || monthKey(new Date()), date: kind === 'actual' ? date : undefined, note: note.trim() || undefined };
    if (editing) update(editing.id, data); else add(data);
    router.back();
  };

  const del = () =>
    Alert.alert('Delete this entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { remove(editing!.id); router.back(); } },
    ]);

  return (
    <Sheet>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="heading" style={{ fontSize: 22 }}>{editing ? 'Edit entry' : 'Add entry'}</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <Segmented options={[{ value: 'actual', label: 'Actual' }, { value: 'planned', label: 'Planned' }]} value={kind} onChange={setKind} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TYPES.map((t) => (
              <Chip key={t.value} label={t.label} selected={type === t.value} tint={TYPE_STYLE[t.value].tint} tintText={TYPE_STYLE[t.value].text}
                onPress={() => { setType(t.value); setCategory(''); }} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, justifyContent: 'center', paddingVertical: 6 }}>
            <AppText variant="display" color={tone.fg}>₹</AppText>
            <TextInput
              accessibilityLabel="Amount in rupees"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              placeholder="0"
              placeholderTextColor={colors.switchOff}
              keyboardType="decimal-pad"
              style={{ minWidth: 80, textAlign: 'center', fontFamily: font.extrabold, fontSize: 44, color: tone.fg, letterSpacing: -1 }}
            />
          </View>

          <AppText variant="label" color={colors.muted}>CATEGORY</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cats.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput accessibilityLabel="New category" value={newCat} onChangeText={setNewCat} placeholder="New category" placeholderTextColor={colors.muted} style={[field, { flex: 1 }]} />
            <Button label="Add" variant="outline" disabled={!newCat.trim()} onPress={() => { setCategory(newCat.trim()); setNewCat(''); }} style={{ paddingHorizontal: 18 }} />
          </View>

          {kind === 'actual' ? (
            <TextInput accessibilityLabel="Date, year-month-day" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" maxLength={10}
              style={[field, !dateOk && { borderColor: colors.danger }]} />
          ) : null}
          <TextInput accessibilityLabel="Note" value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor={colors.muted} style={field} />

          <Button label={editing ? 'Save changes' : 'Save'} disabled={!canSave} height={56} onPress={save} />
          {editing ? <Button label="Delete entry" variant="danger" onPress={del} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
