import { useMemo, useState } from 'react';
import { Alert, TextInput, View, FlatList, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { MonthMenu } from '@/components/MonthMenu';
import { Segmented } from '@/components/ui/Segmented';
import { EntryRow, typeStyle } from '@/components/EntryRow';
import { useEntries } from '@/store/entries';
import { useUi } from '@/store/ui';
import { fullMonth } from '@/lib/dates';
import { formatINR } from '@/lib/money';
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
  const [monthMenu, setMonthMenu] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const amountQuery = q.replace(/\D/g, '');
    const list = entries
      .filter((e) => e.kind === kind && e.month === month && (filter === 'all' || e.type === filter))
      .filter((e) => {
        if (!q) return true;
        const textMatch = `${e.category} ${e.note ?? ''}`.toLowerCase().includes(q.toLowerCase());
        const entryAmount = formatINR(e.amountPaise).replace(/\D/g, '');
        return textMatch || (amountQuery.length > 0 && entryAmount.includes(amountQuery));
      })
      .sort((a, b) => (b.date ?? b.month).localeCompare(a.date ?? a.month));
    const out: Row[] = [];
    let last = '';
    for (const e of list) {
      if (kind === 'planned') {
        const group = e.type[0].toUpperCase() + e.type.slice(1);
        if (group !== last) { out.push({ kind: 'header', key: `h-${group}-${out.length}`, label: group }); last = group; }
      }
      out.push({ kind: 'entry', key: e.id, entry: e });
    }
    return out;
  }, [entries, kind, month, filter, q]);

  const summary = useMemo(() => {
    const matching = entries
      .filter((e) => e.kind === kind && e.month === month)
      .filter((e) => !q || `${e.category} ${e.note ?? ''}`.toLowerCase().includes(q.toLowerCase()));
    const allTotal = matching.reduce((sum, entry) => sum + entry.amountPaise, 0);
    const selected = filter === 'all' ? matching : matching.filter((entry) => entry.type === filter);
    const total = selected.reduce((sum, entry) => sum + entry.amountPaise, 0);
    return { total, count: selected.length, share: allTotal > 0 ? Math.round((total / allTotal) * 100) : 0 };
  }, [entries, kind, month, filter, q]);

  const confirmDelete = (e: Entry) =>
    Alert.alert('Delete this entry?', `${e.note || e.category} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(e.id) },
    ]);

  const actions = (e: Entry) => (
    <View style={{ flexDirection: 'row' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit" onPress={() => router.push({ pathname: '/add', params: { id: e.id } })} style={{ width: 72, backgroundColor: colors.editAction, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="edit-2" size={20} color={colors.white} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete" onPress={() => confirmDelete(e)} style={{ width: 72, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="trash-2" size={20} color={colors.white} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Animated.FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 12, gap: 12, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ flex: 1 }}>Activity</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={`Change month, currently ${fullMonth(month)}`} onPress={() => setMonthMenu(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', minHeight: 28 }}>
                <AppText variant="heading" style={{ fontSize: 15 }}>{fullMonth(month)}</AppText>
                <Feather name="chevron-down" size={15} color={colors.text} />
              </Pressable>
            </View>

            <MonthMenu visible={monthMenu} month={month} onChange={setMonth} onClose={() => setMonthMenu(false)} />
            <Segmented options={[{ value: 'actual', label: 'Actual' }, { value: 'planned', label: 'Planned' }]} value={kind} onChange={setKind} />
            <View style={{ height: 48, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}>
              <Feather name="search" size={18} color={colors.muted} />
              <TextInput accessibilityLabel="Search entries by category, note or amount" value={q} onChangeText={setQ} placeholder="Search category, note or amount" placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text }} />
            </View>
            <FlatList horizontal showsHorizontalScrollIndicator={false} data={FILTERS} keyExtractor={(f) => f.value} contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const meta = item.value === 'all'
                  ? { icon: 'layers' as const, tint: colors.ink, text: colors.white }
                  : typeStyle(item.value);
                const selected = filter === item.value;
                return (
                  <Chip
                    key={item.value}
                    label={item.label}
                    selected={selected}
                    tint={meta.tint}
                    tintText={meta.text}
                    icon={<Feather name={meta.icon} size={14} color={selected ? meta.text : colors.muted} />}
                    height={40}
                    onPress={() => setFilter(item.value)}
                  />
                );
              }} />
            <View style={{ minHeight: 42, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <AppText variant="caption" color={colors.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
                {filter === 'all' ? `All · ${summary.count} ${summary.count === 1 ? 'entry' : 'entries'}` : `${FILTERS.find((item) => item.value === filter)?.label} · ${summary.share}% of total`}
              </AppText>
              <AppText variant="subheading" numberOfLines={1}>{formatINR(summary.total)}</AppText>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 + insets.bottom }}
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
