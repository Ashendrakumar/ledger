import { useMemo, useState } from 'react';
import { Alert, TextInput, View, FlatList, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { BlurView } from 'expo-blur';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { MonthMenu } from '@/components/MonthMenu';
import { Segmented } from '@/components/ui/Segmented';
import { EntryRow, TYPE_STYLE } from '@/components/EntryRow';
import { useEntries } from '@/store/entries';
import { useUi } from '@/store/ui';
import { fullMonth, relativeDay } from '@/lib/dates';
import type { Entry, EntryType, Kind } from '@/types';

const FILTERS: { value: EntryType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }, { value: 'saving', label: 'Savings' },
];
const TYPE_META: Record<EntryType, { icon: React.ComponentProps<typeof Feather>['name']; tint: string; text: string }> = {
  expense: { icon: 'shopping-bag', tint: TYPE_STYLE.expense.tint, text: TYPE_STYLE.expense.text },
  income: { icon: 'arrow-down-left', tint: TYPE_STYLE.income.tint, text: TYPE_STYLE.income.text },
  saving: { icon: 'archive', tint: TYPE_STYLE.saving.tint, text: TYPE_STYLE.saving.text },
};
const ALL_META: { icon: React.ComponentProps<typeof Feather>['name']; tint: string; text: string } = { icon: 'layers', tint: colors.ink, text: colors.white };

type Row = { kind: 'header'; key: string; label: string } | { kind: 'entry'; key: string; entry: Entry };

export default function Activity() {
  const insets = useSafeAreaInsets();
  const { entries, remove } = useEntries();
  const { month, setMonth } = useUi();
  const [kind, setKind] = useState<Kind>('actual');
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [q, setQ] = useState('');
  const [monthMenu, setMonthMenu] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(260);

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

  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { y.value = e.contentOffset.y; } });
  const headerOverlayStyle = useAnimatedStyle(() => {
    const t = interpolate(y.value, [0, 24], [0, 1], Extrapolation.CLAMP);
    return {
      backgroundColor: `rgba(242,246,244,${interpolate(t, [0, 1], [0.45, 0.82], Extrapolation.CLAMP)})`,
      borderBottomColor: `rgba(226,232,228,${interpolate(t, [0, 1], [0, 0.9], Extrapolation.CLAMP)})`,
      borderBottomWidth: StyleSheet.hairlineWidth,
      shadowColor: '#000',
      shadowOpacity: interpolate(t, [0, 1], [0, 0.06], Extrapolation.CLAMP),
      shadowRadius: interpolate(t, [0, 1], [0, 8], Extrapolation.CLAMP),
      shadowOffset: { width: 0, height: 2 },
      elevation: interpolate(t, [0, 1], [0, 3], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, overflow: 'hidden' }}>
        <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, headerOverlayStyle]} />
        <View
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 14, paddingBottom: 8, gap: 12 }}
        >
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
        <View style={{ height: 48, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput accessibilityLabel="Search entries" value={q} onChangeText={setQ} placeholder="Search category or note" placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text }} />
        </View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={FILTERS} keyExtractor={(f) => f.value} contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const meta = item.value === 'all' ? ALL_META : TYPE_META[item.value];
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
        </View>
      </View>

      <Animated.FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: headerHeight + 12, paddingBottom: 130 + insets.bottom }}
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
