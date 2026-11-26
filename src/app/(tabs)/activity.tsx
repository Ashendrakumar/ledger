import { useCallback, useMemo, useState } from 'react';
import { Alert, View, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { typeStyle } from '@/components/EntryRow';
import { EntrySectionHeader } from '@/components/EntrySectionHeader';
import { EntryListControls } from '@/components/EntryListControls';
import { EntryCardRow } from '@/components/EntryCardRow';
import { AccumulatedEntryRow } from '@/components/AccumulatedEntryRow';
import { EntryListSummary } from '@/components/EntryListSummary';
import { EmptyState } from '@/components/EmptyState';
import { Money } from '@/components/ui/Money';
import { SwipeActions } from '@/components/ui/SwipeActions';
import { useEntries } from '@/store/entries';
import { useLoans } from '@/store/loans';
import { useUi } from '@/store/ui';
import { formatINR } from '@/lib/money';
import { total } from '@/lib/selectors';
import type { Entry, EntryType } from '@/types';

const SECTIONS: { type: EntryType; title: string }[] = [
  { type: 'income', title: 'Income' },
  { type: 'expense', title: 'Expenses' },
  { type: 'saving', title: 'Savings' },
];
type Row =
  | { kind: 'section'; key: string; type: EntryType; title: string; total: number; collapsed: boolean; empty: boolean }
  | { kind: 'entry'; key: string; entry: Entry; last: boolean }
  | { kind: 'empty'; key: string };

export default function Activity() {
  const insets = useSafeAreaInsets();
  const { entries, remove } = useEntries();
  const payments = useLoans((state) => state.payments);
  const month = useUi((state) => state.month);
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState<Record<EntryType, boolean>>({ income: false, expense: false, saving: false });
  const [accumulated, setAccumulated] = useState(false);
  const normalizedQuery = q.trim().toLowerCase();
  const amountQuery = normalizedQuery.replace(/\D/g, '');
  const amountSearch = normalizedQuery.length > 0 && /^[\d₹,\s]+$/.test(normalizedQuery);
  const matchesQuery = useCallback((entry: Entry) => {
    if (!normalizedQuery) return true;
    if (`${entry.category} ${entry.note ?? ''}`.toLowerCase().includes(normalizedQuery)) return true;
    if (!amountSearch || !amountQuery) return false;
    return formatINR(entry.amountPaise).replace(/\D/g, '').includes(amountQuery);
  }, [normalizedQuery, amountSearch, amountQuery]);

  const actualTotals = useMemo(() => ({
    income: total(entries, month, 'actual', 'income'),
    expense: total(entries, month, 'actual', 'expense'),
    saving: total(entries, month, 'actual', 'saving'),
  }), [entries, month]);
  const actualEmiPaid = useMemo(
    () => payments.filter((payment) => payment.month === month && payment.kind === 'actual').reduce((sum, payment) => sum + payment.amountPaise, 0),
    [payments, month],
  );
  const actualLeft = actualTotals.income - actualTotals.expense - actualTotals.saving;

  const actualEntries = useMemo(
    () => entries
      .filter((entry) => entry.kind === 'actual' && entry.month === month)
      .sort((a, b) => (b.date ?? b.month).localeCompare(a.date ?? a.month)),
    [entries, month],
  );
  const visibleEntries = useMemo(
    () => actualEntries
      .filter((entry) => filter === 'all' || entry.type === filter)
      .filter(matchesQuery),
    [actualEntries, filter, matchesQuery],
  );

  const rows = useMemo<Row[]>(() => {
    if (!accumulated) {
      if (visibleEntries.length === 0) return [{ kind: 'empty', key: 'empty-list' }];
      return visibleEntries.map((entry) => ({ kind: 'entry', key: entry.id, entry, last: false }));
    }

    const out: Row[] = [];
    for (const section of SECTIONS) {
      if (filter !== 'all' && filter !== section.type) continue;
      const sectionEntries = actualEntries.filter((entry) => entry.type === section.type);
      const isCollapsed = collapsed[section.type];
      out.push({
        kind: 'section',
        key: `section-${section.type}`,
        type: section.type,
        title: section.title,
        total: sectionEntries.reduce((sum, entry) => sum + entry.amountPaise, 0),
        collapsed: isCollapsed,
        empty: sectionEntries.length === 0,
      });
      if (isCollapsed) continue;
      if (sectionEntries.length === 0) {
        out.push({ kind: 'empty', key: `empty-${section.type}` });
        continue;
      }
      sectionEntries.forEach((entry, index) => {
        out.push({ kind: 'entry', key: entry.id, entry, last: index === sectionEntries.length - 1 });
      });
    }
    return out;
  }, [actualEntries, filter, visibleEntries, collapsed, accumulated]);

  const summary = useMemo(() => {
    return {
      total: visibleEntries.reduce((sum, entry) => sum + entry.amountPaise, 0),
      count: visibleEntries.length,
    };
  }, [visibleEntries]);
  const summaryLabel = filter === 'all' ? 'All' : SECTIONS.find((section) => section.type === filter)?.title ?? 'All';

  const confirmDelete = (e: Entry) =>
    Alert.alert('Delete this entry?', `${e.note || e.category} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(e.id) },
    ]);

  const actions = (e: Entry) => (
    <SwipeActions
      onEdit={() => router.push({ pathname: '/add', params: { id: e.id } })}
      onDelete={() => confirmDelete(e)}
    />
  );
  const toggleSection = (type: EntryType) => setCollapsed((state) => ({ ...state, [type]: !state[type] }));
  const showAccumulated = () => {
    setQ('');
    setFilter('all');
    setAccumulated(true);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={40}
        windowSize={9}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 12, gap: 12, paddingBottom: 8 }}>
            <ScreenHeader title="Actual" back={accumulated} onBackPress={() => setAccumulated(false)} />

            {accumulated ? <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {SECTIONS.map((section) => {
                  const style = typeStyle(section.type);
                  return (
                    <View key={section.type} style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Feather name={style.icon} size={13} color={style.fg} />
                        <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 12 }}>{section.title}</AppText>
                      </View>
                      <Money paise={actualTotals[section.type]} variant="subheading" color={colors.white} style={{ fontSize: 17 }} />
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
                <AppText variant="caption" color={colors.onInkMuted}>EMI paid this month</AppText>
                <Money paise={actualEmiPaid} variant="subheading" color={colors.mint} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
                <AppText variant="caption" color={colors.onInkMuted}>Actual left</AppText>
                <View style={{ backgroundColor: 'rgba(95,211,181,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Money paise={actualLeft} variant="subheading" color={actualLeft < 0 ? '#FF9C8F' : colors.mint} />
                </View>
              </View>
            </View> : null}
            {!accumulated ? (
              <EntryListControls
                query={q}
                onQueryChange={setQ}
                filter={filter}
                onFilterChange={setFilter}
                accumulated={false}
                onToggleAccumulated={showAccumulated}
              />
            ) : null}
            {!accumulated ? <EntryListSummary label={summaryLabel} count={summary.count} totalPaise={summary.total} /> : null}
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 + insets.bottom }}
        renderItem={({ item }) => {
          if (item.kind === 'section') {
            const style = typeStyle(item.type);
            const roundedBottom = item.collapsed;
            return (
              <View style={{
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderTopWidth: 1,
                borderBottomWidth: roundedBottom ? 1 : 0,
                borderColor: colors.border,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                borderBottomLeftRadius: roundedBottom ? 20 : 0,
                borderBottomRightRadius: roundedBottom ? 20 : 0,
                overflow: 'hidden',
                marginBottom: roundedBottom ? 14 : 0,
              }}>
                <EntrySectionHeader
                  title={item.title}
                  icon={style.icon}
                  totalPaise={item.total}
                  tint={style.tint}
                  text={style.text}
                  collapsed={item.collapsed}
                  onToggle={() => toggleSection(item.type)}
                />
              </View>
            );
          }
          if (item.kind === 'empty') {
            if (item.key === 'empty-list') {
              const noMatches = actualEntries.length > 0;
              return (
                <EmptyState
                  title={noMatches ? 'No matching entries' : 'Nothing recorded yet'}
                  description={noMatches ? 'Try changing your search or filter, or add a new entry.' : 'Add your first entry to start tracking this month.'}
                  actionLabel="Add entry"
                  onAction={() => router.push('/add')}
                />
              );
            }
            return (
              <View style={{
                padding: 16,
                backgroundColor: colors.card,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                marginBottom: 14,
              }}>
                <AppText color={colors.muted} variant="caption">
                  Nothing recorded.
                </AppText>
              </View>
            );
          }
          if (!accumulated) {
            return (
              <View style={{ marginBottom: 6, borderRadius: 16, overflow: 'hidden' }}>
                <ReanimatedSwipeable renderRightActions={() => actions(item.entry)} overshootRight={false}>
                  <EntryCardRow entry={item.entry} onPress={() => router.push({ pathname: '/add', params: { id: item.entry.id } })} />
                </ReanimatedSwipeable>
              </View>
            );
          }
          return (
            <View style={{
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: item.last ? 1 : 0,
              borderColor: colors.border,
              borderBottomLeftRadius: item.last ? 20 : 0,
              borderBottomRightRadius: item.last ? 20 : 0,
              overflow: 'hidden',
              marginBottom: item.last ? 14 : 0,
            }}>
              <ReanimatedSwipeable renderRightActions={() => actions(item.entry)} overshootRight={false}>
                <AccumulatedEntryRow entry={item.entry} onPress={() => router.push({ pathname: '/add', params: { id: item.entry.id } })} />
              </ReanimatedSwipeable>
            </View>
          );
        }}
      />
    </View>
  );
}
