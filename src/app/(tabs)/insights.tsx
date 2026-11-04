import { useMemo } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { MonthPill } from '@/components/ui/MonthPill';
import { Donut, DONUT_COLORS } from '@/components/charts/Donut';
import { BarChart } from '@/components/charts/BarChart';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useEntries } from '@/store/entries';
import { useLoans } from '@/store/loans';
import { useUi } from '@/store/ui';
import { byCategory, monthlyHistory, total } from '@/lib/selectors';
import { getLoanOverview } from '@/lib/emi';
import { formatINR } from '@/lib/money';
import { shortMonth, labelMonth } from '@/lib/dates';

export default function Insights() {
  const entries = useEntries((s) => s.entries);
  const { month, setMonth } = useUi();
  const loans = useLoans((s) => s.loans);
  const loanPayments = useLoans((s) => s.payments);

  const d = useMemo(() => {
    const cats = byCategory(entries, month, 'expense').filter((c) => c.actual > 0).sort((a, b) => b.actual - a.actual);
    const spent = cats.reduce((a, c) => a + c.actual, 0);
    const income = total(entries, month, 'actual', 'income');
    const saved = total(entries, month, 'actual', 'saving');
    const over = byCategory(entries, month, 'expense').filter((c) => c.planned > 0 && c.actual > c.planned).sort((a, b) => (b.actual - b.planned) - (a.actual - a.planned))[0];
    return { cats, spent, rate: income ? Math.round((saved / income) * 100) : 0, over, hist: monthlyHistory(entries, month) };
  }, [entries, month]);

  const debt = useMemo(() => {
    if (loans.length === 0) return null;
    const emi = loans.reduce((a, l) => a + l.emiPaise, 0);
    const income = total(entries, month, 'actual', 'income');
    let remainingInterest = 0;
    let payoffMonth: string | undefined;
    for (const l of loans) {
      const ov = getLoanOverview(l, loanPayments);
      remainingInterest += ov.remainingInterest;
      const last = ov.schedule.length ? ov.schedule[ov.schedule.length - 1].month : undefined;
      if (last && (!payoffMonth || last > payoffMonth)) payoffMonth = last;
    }
    const ratio = income > 0 ? emi / income : emi > 0 ? 1 : 0;
    const band =
      ratio >= 0.5 ? { label: 'Risky', fg: colors.danger, tint: '#FADBD8' }
      : ratio >= 0.35 ? { label: 'Strained', fg: colors.expense, tint: colors.expenseTint }
      : { label: 'Healthy', fg: colors.savings, tint: colors.savingsTint };
    return { emi, income, ratio, band, remainingInterest, payoffMonth };
  }, [loans, loanPayments, entries, month]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">Insights</AppText>
        <MonthPill month={month} onChange={setMonth} />
      </View>

      <Card style={{ gap: 12 }}>
        <AppText variant="subheading">Where your money went</AppText>
        {d.cats.length === 0 ? <AppText color={colors.muted} variant="caption">No spending logged this month.</AppText> : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Donut values={d.cats.map((c) => c.actual)} centerTop={formatINR(d.spent)} centerBottom="spent" />
            <View style={{ flex: 1, gap: 6 }}>
              {d.cats.slice(0, 6).map((c, i) => (
                <View key={c.category} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: DONUT_COLORS[i], borderWidth: i > 3 ? 1 : 0, borderColor: '#D9A57F' }} />
                  <AppText variant="caption" style={{ flex: 1, color: colors.text }}>{c.category}</AppText>
                  <AppText variant="subheading" style={{ fontSize: 13 }}>{Math.round((c.actual / d.spent) * 100)}%</AppText>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="subheading">Income vs expenses</AppText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[['Income', colors.income], ['Expenses', colors.expense]].map(([l, c]) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} /><AppText variant="caption" style={{ fontSize: 12 }} color={colors.textSoft}>{l}</AppText>
              </View>
            ))}
          </View>
        </View>
        <BarChart data={d.hist.map((h) => ({ label: shortMonth(h.month), a: h.income, b: h.expense }))} />
      </Card>

      {debt ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="subheading">Debt service</AppText>
            <View style={{ backgroundColor: debt.band.tint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
              <AppText variant="caption" color={debt.band.fg} style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{debt.band.label}</AppText>
            </View>
          </View>
          <AppText variant="display" color={debt.band.fg} style={{ fontSize: 28 }}>{Math.round(debt.ratio * 100)}%</AppText>
          <ProgressBar ratio={Math.min(1, debt.ratio)} color={debt.band.fg} height={8} />
          <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>EMI {formatINR(debt.emi)} against {formatINR(debt.income)} income this month</AppText>
          <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Interest remaining {formatINR(debt.remainingInterest)} · Payoff {debt.payoffMonth ? labelMonth(debt.payoffMonth) : '—'}</AppText>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: colors.savingsTint, borderRadius: 20, padding: 14 }}>
          <AppText variant="caption" color={colors.textSoft} style={{ fontSize: 12 }}>Savings rate</AppText>
          <AppText variant="display" color={colors.savingsText} style={{ fontSize: 26 }}>{d.rate}%</AppText>
          <AppText variant="caption" color={colors.textSoft} style={{ fontSize: 12 }}>of income saved</AppText>
        </View>
        {d.over ? (
          <View style={{ flex: 1.4, backgroundColor: colors.expenseTint, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 10 }}>
            <Feather name="alert-triangle" size={20} color={colors.danger} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" color={colors.expenseText} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 }}>{d.over.category} over plan</AppText>
              <AppText variant="caption" color={colors.textSoft} style={{ fontSize: 12 }}>{formatINR(d.over.actual - d.over.planned)} above this month’s budget.</AppText>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
