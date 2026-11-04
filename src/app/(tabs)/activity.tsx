import { useMemo, useState } from 'react';
import { Alert, TextInput, View, FlatList, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { MonthPill } from '@/components/ui/MonthPill';
import { Segmented } from '@/components/ui/Segmented';
import { EntryRow } from '@/components/EntryRow';
import { useEntries } from '@/store/entries';
import { useUi } from '@/store/ui';
import { relativeDay } from '@/lib/dates';
import type { Entry, EntryType, Kind } from '@/types';

const FILTERS: { value: EntryType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }, { value: 'saving', label: 'Savings' },
];

type Row = { kind: 'header'; key: string; label: string } | { kind: 'entry'; key: string; entry: Entry };

export default function Activity() {
  const insets = useSafeAreaInsets();
  const { entries, remove } = useEntries();
  const { month, setMonth } = useUi();
  const [kind, setKind] = useState<Kind>('actual');
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [q, setQ] = useState('');

  const rows = useMemo<Row[]>(() => {
    const list = entries
      .filter((e) => e.kind === kind && e.month === month && (filter === 'all' || e.type === filter))
      .filter((e) => !q || `${e.category} ${e.note ?? ''}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.date ?? b.month).localeCompare(a.date ?? a.month));
    const out: Row[] = [];
    let last = '';
    for (const e of list) {
      const group = kind === 'actual' ? relativeDay(e.date!) : e.type[0].toUpperCase() + e.type.slice(1);
      if (group !== last) { out.push({ kind: 'header', key: `h-${group}-${out.length}`, label: group }); last = group; }
      out.push({ kind: 'entry', key: e.id, entry: e });
    }
    return out;
  }, [entries, kind, month, filter, q]);

  const confirmDelete = (e: Entry) =>
    Alert.alert('Delete this entry?', `${e.note || e.category} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(e.id) },
    ]);

  const actions = (e: Entry) => (
    <View style={{ flexDirection: 'row' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit" onPress={() => router.push({ pathname: '/add', params: { id: e.id } })} style={{ width: 72, backgroundColor: colors.savings, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="edit-2" size={20} color={colors.white} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete" onPress={() => confirmDelete(e)} style={{ width: 72, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="trash-2" size={20} color={colors.white} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="title">Activity</AppText>
          <MonthPill month={month} onChange={setMonth} />
        </View>
        <Segmented options={[{ value: 'actual', label: 'Actual' }, { value: 'planned', label: 'Planned' }]} value={kind} onChange={setKind} />
        <View style={{ height: 48, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput accessibilityLabel="Search entries" value={q} onChangeText={setQ} placeholder="Search category or note" placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text }} />
        </View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={FILTERS} keyExtractor={(f) => f.value} contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => <Chip label={item.label} selected={filter === item.value} onPress={() => setFilter(item.value)} />} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 130 + insets.bottom }}
        ListEmptyComponent={<AppText color={colors.muted} style={{ textAlign: 'center', marginTop: 40 }}>Nothing here for this month.</AppText>}
        renderItem={({ item, index }) =>
          item.kind === 'header' ? (
            <AppText variant="label" color={colors.muted} style={{ marginTop: index ? 14 : 4, marginBottom: 6 }}>{item.label.toUpperCase()}</AppText>
          ) : (
            <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 6 }}>
              <ReanimatedSwipeable renderRightActions={() => actions(item.entry)} overshootRight={false}>
                <EntryRow entry={item.entry} onPress={() => router.push({ pathname: '/add', params: { id: item.entry.id } })} />
              </ReanimatedSwipeable>
            </View>
          )
        }
      />
    </View>
  );
}
