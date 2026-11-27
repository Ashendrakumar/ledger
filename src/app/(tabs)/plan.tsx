import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Money } from '@/components/ui/Money';
import { EntrySectionHeader } from '@/components/EntrySectionHeader';
import { EntryListControls } from '@/components/EntryListControls';
import { EntryCardRow } from '@/components/EntryCardRow';
import { AccumulatedEntryRow } from '@/components/AccumulatedEntryRow';
import { EntryListSummary } from '@/components/EntryListSummary';
import { EmptyState } from '@/components/EmptyState';
import { typeStyle } from '@/components/EntryRow';
import { SwipeActions } from '@/components/ui/SwipeActions';
import { useEntries } from '@/store/entries';
import { useLoans } from '@/store/loans';
import { useUi } from '@/store/ui';
import { total, inMonth } from '@/lib/selectors';
import { fullMonth, shiftMonth } from '@/lib/dates';
import { buildSchedule } from '@/lib/emi';
import { formatINR } from '@/lib/money';
import type { Entry, EntryType } from '@/types';

const GROUPS: { type: EntryType; title: string }[] = [
  { type: 'income', title: 'Income' }, { type: 'expense', title: 'Expenses' }, { type: 'saving', title: 'Savings' },
];

export default function Plan() {
  const { entries, remove, copyPlanFromPrevious } = useEntries();
  const { loans, payments } = useLoans();
  const month = useUi((state) => state.month);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [query, setQuery] = useState('');
  const [accumulated, setAccumulated] = useState(false);
  const toggle = (key: string) => setCollapsed((s) => ({ ...s, [key]: !s[key] }));

  const planned = useMemo(() => inMonth(entries, month, 'planned'), [entries, month]);
  const normalizedQuery = query.trim().toLowerCase();
  const amountQuery = normalizedQuery.replace(/\D/g, '');
  const amountSearch = normalizedQuery.length > 0 && /^[\d₹,\s]+$/.test(normalizedQuery);
  const filteredPlanned = useMemo(
    () =>
      planned
        .filter((entry) => filter === 'all' || entry.type === filter)
        .filter((entry) => {
          if (!normalizedQuery) return true;
          if (`${entry.category} ${entry.note ?? ''}`.toLowerCase().includes(normalizedQuery)) return true;
          return amountSearch && !!amountQuery && formatINR(entry.amountPaise).replace(/\D/g, '').includes(amountQuery);
        })
        .sort((a, b) => (b.date ?? b.month).localeCompare(a.date ?? a.month)),
    [planned, filter, normalizedQuery, amountSearch, amountQuery],
  );
  const summaryTotal = filteredPlanned.reduce((sum, entry) => sum + entry.amountPaise, 0);
  const summaryLabel = filter === 'all' ? 'All' : GROUPS.find((group) => group.type === filter)?.title ?? 'All';
  const t = (type: EntryType) => total(entries, month, 'planned', type);
  const left = t('income') - t('expense') - t('saving');

  const emiRows = useMemo(
    () =>
      loans
        .map((l) => ({ loan: l, row: buildSchedule(l, payments).find((r) => r.month === month) }))
        .filter((x): x is { loan: (typeof loans)[number]; row: NonNullable<typeof x.row> } => !!x.row),
    [loans, payments, month],
  );
  const emiTotal = emiRows.reduce((a, r) => a + r.row.emi, 0);
  const emiLeft = emiRows.reduce((a, r) => a + (r.row.paid ? 0 : Math.max(0, r.row.emi - r.row.paidAmount)), 0);

  const confirmDelete = (entry: Entry) =>
    Alert.alert('Delete this entry?', `${entry.note || entry.category} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(entry.id) },
    ]);

  const actions = (entry: Entry) => (
    <SwipeActions
      onEdit={() => router.push({ pathname: '/add', params: { id: entry.id } })}
      onDelete={() => confirmDelete(entry)}
    />
  );

  const showAccumulated = () => {
    setQuery('');
    setFilter('all');
    setAccumulated(true);
  };
  return (
    <>
      <Screen header={<ScreenHeader title="Plan" back={accumulated} onBackPress={() => setAccumulated(false)} />} contentContainerStyle={{ gap: 12 }}>

      {accumulated ? <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {GROUPS.map((g) => (
            <View key={g.type} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name={typeStyle(g.type).icon} size={13} color={typeStyle(g.type).fg} />
            <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 12 }}>{g.title}</AppText>
          </View>
              <Money paise={t(g.type)} variant="subheading" color={colors.white} style={{ fontSize: 17 }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>EMI left to pay this month</AppText>
          <View style={{ alignItems: 'flex-end' }}>
            <Money paise={emiLeft} variant="subheading" color={colors.mint} />
            {emiTotal > 0 ? <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 11 }}>of {formatINR(emiTotal)} due</AppText> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>Left to allocate</AppText>
          <View style={{ backgroundColor: 'rgba(95,211,181,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Money paise={left} variant="subheading" color={left < 0 ? '#FF9C8F' : colors.mint} />
          </View>
        </View>
      </View> : null}

      {!accumulated && (planned.length > 0 || normalizedQuery.length > 0) ? (
        <EntryListControls
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          accumulated={false}
          onToggleAccumulated={showAccumulated}
        />
      ) : null}
      {!accumulated && (planned.length > 0 || normalizedQuery.length > 0) ? <EntryListSummary label={summaryLabel} count={filteredPlanned.length} totalPaise={summaryTotal} /> : null}

      {accumulated ? <>
        {GROUPS.map((g) => {
          const rows = planned.filter((entry) => entry.type === g.type);
          const s = typeStyle(g.type);
          const closed = !!collapsed[g.type];
          return (
            <Card key={g.type} style={{ padding: 0, overflow: 'hidden' }}>
              <EntrySectionHeader title={g.title} icon={s.icon} totalPaise={t(g.type)} tint={s.tint} text={s.text} collapsed={closed} onToggle={() => toggle(g.type)} />
              {closed ? null : rows.length === 0 ? <View style={{ padding: 16 }}><AppText color={colors.muted} variant="caption">Nothing planned.</AppText></View> : rows.map((entry) => (
                <View key={entry.id} style={{ overflow: 'hidden' }}>
                  <ReanimatedSwipeable
                    renderRightActions={() => actions(entry)}
                    overshootRight={false}
                    dragOffsetFromRight={-24}
                  >
                    <AccumulatedEntryRow entry={entry} onPress={() => router.push({ pathname: '/add', params: { id: entry.id } })} />
                  </ReanimatedSwipeable>
                </View>
              ))}
            </Card>
          );
        })}

        {/* EMI / loans scheduled for the selected month */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
        <EntrySectionHeader title="EMI / Loans" icon="credit-card" totalPaise={emiTotal} tint={colors.expenseTint} text={colors.expenseText} collapsed={!!collapsed.emi} onToggle={() => toggle('emi')} />
        {collapsed.emi ? null : emiRows.length === 0 ? (
          <View style={{ padding: 16, gap: 8 }}>
            <AppText color={colors.muted} variant="caption">{loans.length === 0 ? 'No loans yet. Add one to see its EMI here.' : 'No EMI scheduled for this month.'}</AppText>
            {loans.length === 0 ? (
              <Pressable accessibilityRole="link" accessibilityLabel="Open loans" onPress={() => router.push('/loans')} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}>
                <AppText variant="subheading" color={colors.primary}>Open loans →</AppText>
              </Pressable>
            ) : null}
          </View>
        ) : emiRows.map(({ loan, row }) => {
          const statusText =
            row.status === 'paid' ? 'Paid'
            : row.status === 'planned' ? 'Planned'
            : row.status === 'partial' ? `Partial · ${formatINR(row.emi - row.paidAmount)} left`
            : row.status === 'overdue' ? 'Overdue'
            : row.status === 'due' ? 'EMI due'
            : 'Upcoming';
          const statusColor =
            row.status === 'paid' || row.status === 'planned' ? colors.income
            : row.status === 'overdue' ? colors.danger
            : row.status === 'partial' || row.status === 'due' ? colors.expense
            : colors.muted;
          return (
            <Pressable
              key={loan.id}
              accessibilityRole="button"
              accessibilityLabel={`Loan ${loan.name}, EMI ${formatINR(row.emi)}, ${statusText}`}
              onPress={() => router.push({ pathname: '/loan/[id]', params: { id: loan.id } })}
              style={{ minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.border }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(184,70,10,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="credit-card" size={17} color={colors.expense} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <AppText variant="body" style={{ fontSize: 14 }} numberOfLines={1}>{loan.name}</AppText>
                <AppText variant="caption" color={statusColor} style={{ fontSize: 12 }}>{statusText} · {loan.annualRatePct}% p.a.</AppText>
              </View>
              <Money paise={row.emi} variant="subheading" style={{ fontSize: 14 }} />
            </Pressable>
          );
        })}
        </Card>
      </> : (
        <View style={{ marginTop: -4 }}>
          {filteredPlanned.length === 0 ? (
            <EmptyState
              title={planned.length === 0 ? `Nothing planned for ${fullMonth(month)}` : 'No matching entries'}
              description={planned.length === 0 ? 'Plan your rent, food, travel and savings so you can see how you are doing against it.' : 'Try changing your search or filter, or add a planned entry.'}
              actionLabel="Add planned entry"
              onAction={() => router.push({ pathname: '/add', params: { kind: 'planned' } })}
              variant={planned.length === 0 ? 'planned' : undefined}
              secondaryLabel={planned.length === 0 ? `Copy plan from ${fullMonth(shiftMonth(month, -1))}` : undefined}
              onSecondary={planned.length === 0 ? () => copyPlanFromPrevious(month) : undefined}
              hint={planned.length === 0 ? 'Or build a standard plan from your income.' : undefined}
            />
          ) : (
            <View style={{ gap: 6 }}>
              {filteredPlanned.map((entry) => (
                <View key={entry.id} style={{ borderRadius: 16, overflow: 'hidden' }}>
                  <ReanimatedSwipeable
                    renderRightActions={() => actions(entry)}
                    overshootRight={false}
                    dragOffsetFromRight={-24}
                  >
                    <EntryCardRow entry={entry} onPress={() => router.push({ pathname: '/add', params: { id: entry.id } })} />
                  </ReanimatedSwipeable>
                </View>
              ))}
            </View>
          )}
          </View>
      )}

      </Screen>
    </>
  );
}
