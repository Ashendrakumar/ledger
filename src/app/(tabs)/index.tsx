import { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { Sparkline } from '@/components/charts/Sparkline';
import { EntryRow, typeStyle } from '@/components/EntryRow';
import { PlanActualCard } from '@/components/PlanActualCard';
import { ProfileMenuButton } from '@/components/ProfileMenuButton';
import { EmptyState } from '@/components/EmptyState';
import { MonthMenu } from '@/components/MonthMenu';
import { useEntries } from '@/store/entries';
import { useLoans } from '@/store/loans';
import { useGoals } from '@/store/goals';
import { useUi } from '@/store/ui';
import { balance, balanceTrend, total } from '@/lib/selectors';
import { aggregateLoans, buildSchedule, dueDayOf } from '@/lib/emi';
import { fullMonth, shiftMonth, shortMonth, labelMonth } from '@/lib/dates';
import { formatINR } from '@/lib/money';

export default function Home() {
  const { width: screenWidth } = useWindowDimensions();
  const overviewCardWidth = (screenWidth - 32) * 0.9;
  const entries = useEntries((s) => s.entries);
  const { month, setMonth } = useUi();
  const loans = useLoans((s) => s.loans);
  const loanPayments = useLoans((s) => s.payments);
  const goals = useGoals((s) => s.goals);
  const [monthMenu, setMonthMenu] = useState(false);

  const d = useMemo(() => {
    const t = (kind: 'actual' | 'planned', type: 'income' | 'expense' | 'saving') => total(entries, month, kind, type);
    const monthlyTrend = (type: 'income' | 'expense' | 'saving') => Array.from({ length: 6 }, (_, i) => total(entries, shiftMonth(month, i - 5), 'actual', type));
    const previousMonth = shiftMonth(month, -1);
    const actualIncome = t('actual', 'income');
    const incomeSharePct = (amount: number) => actualIncome > 0 ? Math.round((amount / actualIncome) * 100) : 0;
    const expenseActual = t('actual', 'expense');
    const expensePlanned = t('planned', 'expense');
    const savingsActual = t('actual', 'saving');
    const savingsPlanned = t('planned', 'saving');
    const variancePct = (actual: number, planned: number) => planned > 0 ? Math.round(((actual - planned) / planned) * 100) : null;
    const recent = entries.filter((e) => e.kind === 'actual' && e.month === month).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 4);
    return {
      bal: balance(entries), trend: balanceTrend(entries, month),
      incomeTrend: monthlyTrend('income'), expenseTrend: monthlyTrend('expense'), savingsTrend: monthlyTrend('saving'),
      incomeChange: t('actual', 'income') - total(entries, previousMonth, 'actual', 'income'),
      expenseChange: t('actual', 'expense') - total(entries, previousMonth, 'actual', 'expense'),
      savingsChange: t('actual', 'saving') - total(entries, previousMonth, 'actual', 'saving'),
      incomeSharePct: { income: incomeSharePct(actualIncome), expense: incomeSharePct(t('actual', 'expense')), savings: incomeSharePct(t('actual', 'saving')) },
      plannedOut: t('planned', 'expense') + t('planned', 'saving'),
      actualOut: t('actual', 'expense') + t('actual', 'saving'),
      expenseVariance: { amount: expenseActual - expensePlanned, pct: variancePct(expenseActual, expensePlanned) },
      savingsVariance: { amount: savingsActual - savingsPlanned, pct: variancePct(savingsActual, savingsPlanned) },
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
  const partialLeft = useMemo(() => {
    let left = 0;
    for (const l of loans) {
      const row = buildSchedule(l, loanPayments).find((r) => r.month === month);
      if (row?.status === 'partial') left += Math.max(0, row.emi - row.paidAmount);
    }
    return left;
  }, [loans, loanPayments, month]);

  const goalTotals = useMemo(() => {
    const saved = goals.reduce((a, g) => a + g.savedPaise, 0);
    const active = goals.filter((g) => g.savedPaise < g.targetPaise);
    const next = [...active].sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))[0] ?? null;
    return { saved, count: goals.length, active: active.length, next };
  }, [goals]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const open = (type: string) => router.push({ pathname: '/breakdown/[type]', params: { type } });

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={colors.textSoft} style={{ fontSize: 11 }}>{greeting}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={`Change month, currently ${fullMonth(month)}`} onPress={() => setMonthMenu(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', minHeight: 28 }}>
          <AppText variant="heading" color={colors.text} style={{ fontSize: 15 }}>{fullMonth(month)}</AppText>
          <Feather name="chevron-down" size={15} color={colors.text} />
        </Pressable>
      </View>
      <ProfileMenuButton overdueCount={overdue} />
    </View>
  );

  return (
    <>
      <Screen header={header}>
      <MonthMenu visible={monthMenu} month={month} onChange={setMonth} onClose={() => setMonthMenu(false)} />

      {/* Overview */}
      {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="heading">Overview</AppText>
        <Pressable accessibilityRole="link" accessibilityLabel="See the full plan" onPress={() => router.navigate('/plan')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 }}>
          <AppText variant="caption" color={colors.muted}>Swipe for more</AppText>
          <Feather name="chevron-right" size={14} color={colors.muted} />
        </Pressable>
      </View> */}
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 2 }}
      >
        <View style={{ width: overviewCardWidth, backgroundColor: colors.ink, borderRadius: radius.hero, padding: 14, gap: 7 }}>
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
            <Sparkline values={d.trend} width={overviewCardWidth - 28} height={32} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 }}>
              {trendMonths.map((m, i) => (
                <AppText key={i} variant="caption" color={colors.onInkMuted} style={{ fontSize: 10 }}>{m}</AppText>
              ))}
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 7, gap: 6 }}>
            {/* <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Money paise={d.plannedOut} variant="subheading" color={colors.white} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="calendar" size={11} color={colors.onInkMuted} />
                  <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 10 }}>Planned</AppText>
                </View>
              </View>
              <View style={{ flex: 1, gap: 3, alignItems: 'flex-end' }}>
                <Money paise={d.actualOut} variant="subheading" color={colors.white} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <Feather name="credit-card" size={11} color={colors.onInkMuted} />
                  <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 10 }}>Actual</AppText>
                </View>
              </View>
            </View> */}
            <View style={{ gap: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 11 }}>Expenses vs plan</AppText>
                <AppText variant="caption" color={d.expenseVariance.amount <= 0 ? colors.mint : '#FF9C8F'} style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {formatINR(d.expenseVariance.amount, { sign: true })} · {d.expenseVariance.pct === null ? '—' : `${d.expenseVariance.pct > 0 ? '+' : ''}${d.expenseVariance.pct}%`}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 11 }}>Savings vs plan</AppText>
                <AppText variant="caption" color={d.savingsVariance.amount >= 0 ? colors.mint : '#FF9C8F'} style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {formatINR(d.savingsVariance.amount, { sign: true })} · {d.savingsVariance.pct === null ? '—' : `${d.savingsVariance.pct > 0 ? '+' : ''}${d.savingsVariance.pct}%`}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        <PlanActualCard label="Income" icon={typeStyle('income').icon} actual={d.inc[0]} planned={d.inc[1]} tint={colors.incomeTint} fg={colors.income} text={colors.income} trend={d.incomeTrend} trendMonths={trendMonths} change={d.incomeChange} increaseIsGood incomeSharePct={d.incomeSharePct.income} onPress={() => open('income')} style={{ width: overviewCardWidth }} />
        <PlanActualCard label="Expenses" icon={typeStyle('expense').icon} actual={d.exp[0]} planned={d.exp[1]} tint={colors.expenseTint} fg={colors.expense} text={colors.expenseText} trend={d.expenseTrend} trendMonths={trendMonths} change={d.expenseChange} increaseIsGood={false} incomeSharePct={d.incomeSharePct.expense} onPress={() => open('expense')} style={{ width: overviewCardWidth }} />
        <PlanActualCard label="Savings" icon={typeStyle('saving').icon} actual={d.sav[0]} planned={d.sav[1]} tint={colors.savingsTint} fg={colors.savings} text={colors.savingsText} trend={d.savingsTrend} trendMonths={trendMonths} change={d.savingsChange} increaseIsGood incomeSharePct={d.incomeSharePct.savings} onPress={() => open('saving')} style={{ width: overviewCardWidth }} />
      </ScrollView>

      {/* Loans & EMI */}
      <Pressable accessibilityRole="button" accessibilityLabel="Loans and EMI" onPress={() => router.push('/loans')}
        style={{ backgroundColor: colors.expenseTint, borderRadius: radius.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(184,70,10,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="credit-card" size={20} color={colors.expense} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subheading" style={{ fontSize: 15 }}>Loans & EMI</AppText>
          {loans.length === 0 ? (
            <AppText variant="caption" color={colors.muted}>No loans yet — track EMIs here</AppText>
          ) : overdue > 0 ? (
            <AppText variant="caption" color={colors.danger} style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{overdue} overdue · EMI {formatINR(loanEmi)}/mo</AppText>
          ) : partialLeft > 0 ? (
            <AppText variant="caption" color={colors.expense} style={{ fontFamily: 'PlusJakartaSans_700Bold' }} numberOfLines={1}>EMI partially paid · {formatINR(partialLeft)} left</AppText>
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
      {d.recent.length === 0 ? (
        <EmptyState
          compact
          title="No recent entries"
          description="Add an entry to start tracking this month."
          actionLabel="Add entry"
          onAction={() => router.push('/add')}
        />
      ) : (
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {d.recent.map((e, i) => (
          <View key={e.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <EntryRow entry={e} onPress={() => router.push({ pathname: '/add', params: { id: e.id } })} />
          </View>
        ))}
      </Card>
      )}
      </Screen>
    </>
  );
}
