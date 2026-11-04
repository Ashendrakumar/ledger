import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { Sparkline } from '@/components/charts/Sparkline';
import { EntryRow } from '@/components/EntryRow';
import { PlanActualCard } from '@/components/PlanActualCard';
import { MonthMenu } from '@/components/MonthMenu';
import { useEntries } from '@/store/entries';
import { useLoans } from '@/store/loans';
import { useGoals } from '@/store/goals';
import { useUi } from '@/store/ui';
import { balance, balanceTrend, total } from '@/lib/selectors';
import { aggregateLoans, dueDayOf } from '@/lib/emi';
import { fullMonth, shiftMonth, shortMonth, labelMonth } from '@/lib/dates';
import { formatINR } from '@/lib/money';

export default function Home() {
  const entries = useEntries((s) => s.entries);
  const { month, setMonth } = useUi();
  const loans = useLoans((s) => s.loans);
  const loanPayments = useLoans((s) => s.payments);
  const goals = useGoals((s) => s.goals);
  const [monthMenu, setMonthMenu] = useState(false);

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

  const trendMonths = useMemo(() => Array.from({ length: 6 }, (_, i) => shortMonth(shiftMonth(month, i - 5))), [month]);

  const agg = useMemo(() => aggregateLoans(loans, loanPayments), [loans, loanPayments]);
  const loanOutstanding = agg.outstanding;
  const loanEmi = loans.reduce((a, l) => a + l.emiPaise, 0);
  const overdue = agg.overdue;
  const allLoansPaidOff = loans.length > 0 && loanOutstanding <= 0;
  const nextDueLoan = agg.nextDue ? loans.find((l) => l.id === agg.nextDue!.loanId) : undefined;

  const goalTotals = useMemo(() => {
    const saved = goals.reduce((a, g) => a + g.savedPaise, 0);
    const active = goals.filter((g) => g.savedPaise < g.targetPaise);
    const next = [...active].sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))[0] ?? null;
    return { saved, count: goals.length, active: active.length, next };
  }, [goals]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const open = (type: string) => router.push({ pathname: '/breakdown/[type]', params: { type } });

  const onBell = () => {
    if (overdue > 0) {
      Alert.alert('EMI reminder', `${overdue} loan instalment${overdue === 1 ? ' is' : 's are'} overdue.`, [
        { text: 'Later', style: 'cancel' },
        { text: 'View loans', onPress: () => router.push('/loans') },
      ]);
    } else {
      Alert.alert('All caught up', 'No overdue EMIs or alerts right now.');
    }
  };

  return (
    <Screen>
      {/* Header: avatar + greeting + month picker + alerts */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="user" size={17} color={colors.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>{greeting}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel={`Change month, currently ${fullMonth(month)}`} onPress={() => setMonthMenu(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', minHeight: 28 }}>
            <AppText variant="heading" style={{ fontSize: 15 }}>{fullMonth(month)}</AppText>
            <Feather name="chevron-down" size={15} color={colors.text} />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={overdue > 0 ? `Alerts, ${overdue} overdue EMI${overdue === 1 ? '' : 's'}` : 'Alerts'} onPress={onBell}
          style={{ width: 46, height: 46, marginRight: -8, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="bell" size={22} color={colors.text} />
          {overdue > 0 ? (
            <View style={{ position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.canvas }} />
          ) : null}
        </Pressable>
      </View>

      <MonthMenu visible={monthMenu} month={month} onChange={setMonth} onClose={() => setMonthMenu(false)} />

      {/* Balance hero */}
      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="caption" color={colors.onInkMuted}>Total balance</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: d.change >= 0 ? 'rgba(95,211,181,0.16)' : 'rgba(255,156,143,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Feather name={d.change >= 0 ? 'trending-up' : 'trending-down'} size={12} color={d.change >= 0 ? colors.mint : '#FF9C8F'} />
            <Money paise={d.change} sign variant="caption" color={d.change >= 0 ? colors.mint : '#FF9C8F'} style={{ fontFamily: 'PlusJakartaSans_700Bold' }} />
            <AppText variant="caption" color={d.change >= 0 ? colors.mint : '#FF9C8F'} style={{ fontSize: 11 }}>this month</AppText>
          </View>
        </View>
        <Money paise={d.bal} variant="display" color={colors.white} />
        <View style={{ marginTop: 2 }}>
          <Sparkline values={d.trend} width={300} height={44} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 }}>
            {trendMonths.map((m, i) => (
              <AppText key={i} variant="caption" color={colors.onInkMuted} style={{ fontSize: 10 }}>{m}</AppText>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color={colors.onInkMuted}>Planned (spend + savings)</AppText>
            <Money paise={d.plannedOut} variant="subheading" color={colors.white} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color={colors.onInkMuted}>Spent + saved so far</AppText>
            <Money paise={d.actualOut} variant="subheading" color={colors.white} />
          </View>
        </View>
      </View>

      {/* Planned vs actual */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="heading">Planned vs actual</AppText>
        <Pressable accessibilityRole="link" accessibilityLabel="See the full plan" onPress={() => router.navigate('/plan')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 }}>
          <AppText variant="caption" color={colors.muted}>Swipe for more</AppText>
          <Feather name="chevron-right" size={14} color={colors.muted} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
        <PlanActualCard label="Income" icon="arrow-down-left" actual={d.inc[0]} planned={d.inc[1]} tint={colors.incomeTint} fg={colors.income} text={colors.income} onPress={() => open('income')} style={{ width: 168 }} />
        <PlanActualCard label="Expenses" icon="arrow-up-right" actual={d.exp[0]} planned={d.exp[1]} tint={colors.expenseTint} fg={colors.expense} text={colors.expenseText} onPress={() => open('expense')} style={{ width: 168 }} />
        <PlanActualCard label="Savings" icon="bookmark" actual={d.sav[0]} planned={d.sav[1]} tint={colors.savingsTint} fg={colors.savings} text={colors.savingsText} onPress={() => open('saving')} style={{ width: 168 }} />
      </ScrollView>

      {/* Loans & EMI */}
      <Pressable accessibilityRole="button" accessibilityLabel="Loans and EMI" onPress={() => router.push('/loans')}
        style={{ backgroundColor: colors.expenseTint, borderRadius: radius.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(184,70,10,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="percent" size={20} color={colors.expense} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subheading" style={{ fontSize: 15 }}>Loans & EMI</AppText>
          {loans.length === 0 ? (
            <AppText variant="caption" color={colors.muted}>No loans yet — track EMIs here</AppText>
          ) : overdue > 0 ? (
            <AppText variant="caption" color={colors.danger} style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{overdue} overdue · EMI {formatINR(loanEmi)}/mo</AppText>
          ) : agg.nextDue ? (
            <AppText variant="caption" color={colors.expenseText} numberOfLines={1}>Next EMI {formatINR(agg.nextDue.emi)} · {nextDueLoan ? dueDayOf(nextDueLoan) : 5} {labelMonth(agg.nextDue.month)}</AppText>
          ) : allLoansPaidOff ? (
            <AppText variant="caption" color={colors.income}>All loans paid off</AppText>
          ) : (
            <AppText variant="caption" color={colors.income}>All EMIs paid · {formatINR(loanEmi)}/mo</AppText>
          )}
        </View>
        {loans.length > 0 ? (
          <View style={{ alignItems: 'flex-end', gap: 1 }}>
            <AppText variant="caption" color={colors.textSoft} style={{ fontSize: 11 }}>Total</AppText>
            <Money paise={loanOutstanding} variant="subheading" />
          </View>
        ) : null}
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>

      {/* Goals */}
      <Pressable accessibilityRole="button" accessibilityLabel="Goals" onPress={() => router.push('/goals')}
        style={{ backgroundColor: colors.savingsTint, borderRadius: radius.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(43,91,168,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="target" size={20} color={colors.savings} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subheading" style={{ fontSize: 15 }}>Goals</AppText>
          {goalTotals.count === 0 ? (
            <AppText variant="caption" color={colors.muted}>No goals yet — create one</AppText>
          ) : (
            <AppText variant="caption" color={colors.savingsText} numberOfLines={1}>
              {goalTotals.active} active{goalTotals.next ? ` · ${goalTotals.next.name} ${labelMonth(goalTotals.next.targetMonth)}` : ' · all funded'}
            </AppText>
          )}
        </View>
        {goalTotals.count > 0 ? (
          <View style={{ alignItems: 'flex-end', gap: 1 }}>
            <AppText variant="caption" color={colors.textSoft} style={{ fontSize: 11 }}>Saved</AppText>
            <Money paise={goalTotals.saved} variant="subheading" />
          </View>
        ) : null}
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>

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
