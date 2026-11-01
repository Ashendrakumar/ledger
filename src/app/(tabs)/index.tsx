import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { MonthPill } from '@/components/ui/MonthPill';
import { Sparkline } from '@/components/charts/Sparkline';
import { EntryRow } from '@/components/EntryRow';
import { PlanActualCard } from '@/components/PlanActualCard';
import { useEntries } from '@/store/entries';
import { useAuth } from '@/store/auth';
import { useLoans } from '@/store/loans';
import { useUi } from '@/store/ui';
import { balance, balanceTrend, total } from '@/lib/selectors';
import { outstandingBalance } from '@/lib/emi';
import { formatINR } from '@/lib/money';

export default function Home() {
  const entries = useEntries((s) => s.entries);
  const user = useAuth((s) => s.user);
  const { month, setMonth } = useUi();
  const loans = useLoans((s) => s.loans);
  const loanPayments = useLoans((s) => s.payments);

  const d = useMemo(() => {
    const t = (kind: 'actual' | 'planned', type: 'income' | 'expense' | 'saving') => total(entries, month, kind, type);
    const recent = entries.filter((e) => e.kind === 'actual' && e.month === month).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 4);
    return {
      bal: balance(entries), trend: balanceTrend(entries, month),
      plannedOut: t('planned', 'expense') + t('planned', 'saving'),
      actualOut: t('actual', 'expense') + t('actual', 'saving'),
      change: t('actual', 'income') - t('actual', 'expense') - t('actual', 'saving'),
      inc: [t('actual', 'income'), t('planned', 'income')], exp: [t('actual', 'expense'), t('planned', 'expense')], sav: [t('actual', 'saving'), t('planned', 'saving')],
      recent,
    };
  }, [entries, month]);

  const name = user?.email.split('@')[0] ?? '';
  const loanRows = useMemo(() => loans.map((l) => ({ l, outstanding: outstandingBalance(l, loanPayments) })), [loans, loanPayments]);
  const loanOutstanding = loanRows.reduce((a, r) => a + r.outstanding, 0);
  const loanEmi = loanRows.reduce((a, r) => a + r.l.emiPaise, 0);
  const open = (type: string) => router.push({ pathname: '/breakdown/[type]', params: { type } });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={colors.muted}>Hello,</AppText>
          <AppText variant="heading" numberOfLines={1}>{name}</AppText>
        </View>
        <MonthPill month={month} onChange={setMonth} />
        <Pressable accessibilityRole="button" accessibilityLabel="Goals" onPress={() => router.push('/goals')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="target" size={22} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="settings" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 8 }}>
        <AppText variant="caption" color={colors.onInkMuted}>Balance, all months</AppText>
        <Money paise={d.bal} variant="display" color={colors.white} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name={d.change >= 0 ? 'trending-up' : 'trending-down'} size={16} color={colors.mint} />
          <AppText variant="caption" color={colors.mint}>
            <Money paise={d.change} sign variant="caption" color={colors.mint} /> this month
          </AppText>
        </View>
        <Sparkline values={d.trend} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>Planned (spend + savings)</AppText>
          <Money paise={d.plannedOut} variant="subheading" color={colors.white} />
        </View>
      </View>

      {loanRows.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Loans" onPress={() => router.push('/loans')} style={{ backgroundColor: colors.savingsTint, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.savings, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="credit-card" size={19} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading" style={{ fontSize: 15 }}>Loans</AppText>
            <AppText variant="caption" color={colors.textSoft}>{loanRows.length} loan{loanRows.length === 1 ? '' : 's'} · EMI {formatINR(loanEmi)}/mo · {formatINR(loanOutstanding)} left</AppText>
          </View>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
        <PlanActualCard label="Income" actual={d.inc[0]} planned={d.inc[1]} tint={colors.incomeTint} fg={colors.income} text={colors.income} onPress={() => open('income')} style={{ width: 180 }} />
        <PlanActualCard label="Expenses" actual={d.exp[0]} planned={d.exp[1]} tint={colors.expenseTint} fg={colors.expense} text={colors.expenseText} onPress={() => open('expense')} style={{ width: 180 }} />
        <PlanActualCard label="Savings" actual={d.sav[0]} planned={d.sav[1]} tint={colors.savingsTint} fg={colors.savings} text={colors.savingsText} onPress={() => open('saving')} style={{ width: 180 }} />
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <AppText variant="heading">Recent activity</AppText>
        <Pressable accessibilityRole="link" onPress={() => router.navigate('/activity')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <AppText variant="subheading" color={colors.primary}>See all</AppText>
        </Pressable>
      </View>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {d.recent.length === 0 ? (
          <View style={{ padding: 20 }}><AppText color={colors.muted}>No entries this month yet. Tap + to add one.</AppText></View>
        ) : d.recent.map((e, i) => (
          <View key={e.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <EntryRow entry={e} onPress={() => router.push({ pathname: '/add', params: { id: e.id } })} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
