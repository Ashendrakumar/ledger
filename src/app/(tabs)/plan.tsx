import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { MonthPill } from '@/components/ui/MonthPill';
import { TYPE_STYLE } from '@/components/EntryRow';
import { useEntries } from '@/store/entries';
import { useLoans } from '@/store/loans';
import { useUi } from '@/store/ui';
import { total, inMonth } from '@/lib/selectors';
import { buildSchedule } from '@/lib/emi';
import { fullMonth, shiftMonth } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import type { EntryType } from '@/types';

const GROUPS: { type: EntryType; title: string }[] = [
  { type: 'income', title: 'Income' }, { type: 'expense', title: 'Expenses' }, { type: 'saving', title: 'Savings' },
];

function SectionHeader({ title, totalPaise, tint, text, collapsed, onToggle }: {
  title: string; totalPaise: number; tint: string; text: string; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      accessibilityLabel={`${title} section, ${collapsed ? 'expand' : 'collapse'}`}
      onPress={onToggle}
      style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: tint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
    >
      <AppText variant="label" color={text} style={{ fontSize: 13 }}>{title}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Money paise={totalPaise} variant="label" color={text} style={{ fontSize: 13 }} />
        <Feather name={collapsed ? 'chevron-right' : 'chevron-down'} size={17} color={text} />
      </View>
    </Pressable>
  );
}

export default function Plan() {
  const { entries, copyPlanFromPrevious } = useEntries();
  const { loans, payments } = useLoans();
  const { month, setMonth } = useUi();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((s) => ({ ...s, [key]: !s[key] }));

  const planned = useMemo(() => inMonth(entries, month, 'planned'), [entries, month]);
  const t = (type: EntryType) => total(entries, month, 'planned', type);
  const left = t('income') - t('expense') - t('saving');
  const prev = shiftMonth(month, -1);

  const emiRows = useMemo(
    () =>
      loans
        .map((l) => ({ loan: l, row: buildSchedule(l, payments).find((r) => r.month === month) }))
        .filter((x): x is { loan: (typeof loans)[number]; row: NonNullable<typeof x.row> } => !!x.row),
    [loans, payments, month],
  );
  const emiTotal = emiRows.reduce((a, r) => a + r.row.emi, 0);
  const emiLeft = emiRows.reduce((a, r) => a + (r.row.paid ? 0 : Math.max(0, r.row.emi - r.row.paidAmount)), 0);

  const copy = () => {
    if (planned.length) {
      Alert.alert('Add last month\'s plan?', `${fullMonth(prev)} planned entries will be added to ${fullMonth(month)}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy', onPress: () => copyPlanFromPrevious(month) },
      ]);
    } else copyPlanFromPrevious(month);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">Plan</AppText>
        <MonthPill month={month} onChange={setMonth} />
      </View>

      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {GROUPS.map((g) => (
            <View key={g.type} style={{ flex: 1 }}>
              <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 12 }}>{g.title}</AppText>
              <Money paise={t(g.type)} variant="subheading" color={colors.white} style={{ fontSize: 17 }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>EMI left to pay this month</AppText>
          <Money paise={emiLeft} variant="subheading" color={colors.mint} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>Left to allocate</AppText>
          <View style={{ backgroundColor: 'rgba(95,211,181,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Money paise={left} variant="subheading" color={left < 0 ? '#FF9C8F' : colors.mint} />
          </View>
        </View>
      </View>

      <Button variant="outline" label={`Copy plan from ${fullMonth(prev)}`} icon={<Feather name="copy" size={18} color={colors.primary} />} onPress={copy} />

      {GROUPS.map((g) => {
        const rows = planned.filter((e) => e.type === g.type);
        const s = TYPE_STYLE[g.type];
        const closed = !!collapsed[g.type];
        return (
          <Card key={g.type} style={{ padding: 0, overflow: 'hidden' }}>
            <SectionHeader title={g.title} totalPaise={t(g.type)} tint={s.tint} text={s.text} collapsed={closed} onToggle={() => toggle(g.type)} />
            {closed ? null : rows.length === 0 ? <View style={{ padding: 16 }}><AppText color={colors.muted} variant="caption">Nothing planned.</AppText></View> : rows.map((e) => (
              <Pressable key={e.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/add', params: { id: e.id } })}
                style={{ minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border }}>
                <AppText variant="body" style={{ fontSize: 14 }}>{e.category}</AppText>
                <Money paise={e.amountPaise} variant="subheading" style={{ fontSize: 14 }} />
              </Pressable>
            ))}
          </Card>
        );
      })}

      {/* EMI / loans scheduled for the selected month */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <SectionHeader title="EMI / Loans" totalPaise={emiTotal} tint={colors.expenseTint} text={colors.expenseText} collapsed={!!collapsed.emi} onToggle={() => toggle('emi')} />
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
                <Feather name="percent" size={17} color={colors.expense} />
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
    </Screen>
  );
}
