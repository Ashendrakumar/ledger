import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLoans } from '@/store/loans';
import { outstandingBalance } from '@/lib/emi';
import { formatINR } from '@/lib/money';

export default function Loans() {
  const { loans, payments } = useLoans();

  const rows = useMemo(
    () =>
      loans.map((l) => {
        const outstanding = outstandingBalance(l, payments);
        const repaid = Math.max(0, l.principalPaise - outstanding);
        return { loan: l, outstanding, repaid, ratio: l.principalPaise ? repaid / l.principalPaise : 0 };
      }),
    [loans, payments],
  );

  const outstandingTotal = rows.reduce((a, r) => a + r.outstanding, 0);
  const emiTotal = rows.reduce((a, r) => a + r.loan.emiPaise, 0);
  const borrowedTotal = rows.reduce((a, r) => a + r.loan.principalPaise, 0);

  return (
    <Screen tabBar={false}>
      <ScreenHeader
        title="Loans"
        back
        right={
          <Button
            label="New loan"
            height={44}
            onPress={() => router.push('/loan-new')}
            icon={<Feather name="plus" size={16} color={colors.mint} />}
            style={{ paddingHorizontal: 16, borderRadius: 22 }}
          />
        }
      />

      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 12 }}>
        <AppText variant="caption" color={colors.onInkMuted}>Outstanding across {loans.length} loan{loans.length === 1 ? '' : 's'}</AppText>
        <Money paise={outstandingTotal} variant="display" color={colors.white} style={{ fontSize: 32 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>EMI due / month</AppText>
          <AppText variant="subheading" color={colors.mint}><Money paise={emiTotal} variant="subheading" color={colors.mint} /></AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>Total borrowed</AppText>
          <AppText variant="subheading" color={colors.white}><Money paise={borrowedTotal} variant="subheading" color={colors.white} /></AppText>
        </View>
      </View>

      {rows.length === 0 ? (
        <Card style={{ alignItems: 'center', padding: 24, gap: 10 }}>
          <AppText color={colors.muted} variant="body">No loans yet. Add one to track the EMI, interest and progress.</AppText>
          <Button
            label="New loan"
            height={48}
            onPress={() => router.push('/loan-new')}
            icon={<Feather name="plus" size={16} color={colors.mint} />}
            style={{ paddingHorizontal: 20, borderRadius: 24 }}
          />
        </Card>
      ) : (
        rows.map(({ loan, outstanding, repaid, ratio }) => (
          <Pressable
            key={loan.id}
            accessibilityRole="button"
            accessibilityLabel={`Loan ${loan.name}`}
            onPress={() => router.push({ pathname: '/loan/[id]', params: { id: loan.id } })}
          >
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <AppText variant="heading" style={{ fontSize: 16 }}>{loan.name}</AppText>
                <AppText variant="caption" color={outstanding <= 0 ? colors.savings : colors.muted}>{outstanding <= 0 ? 'Paid off' : 'Outstanding'}</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="caption" color={colors.muted}>Outstanding</AppText>
                  <Money paise={outstanding} variant="display" style={{ fontSize: 24 }} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <AppText variant="caption" color={colors.muted}>EMI</AppText>
                  <Money paise={loan.emiPaise} variant="subheading" />
                </View>
              </View>
              <ProgressBar ratio={ratio} color={colors.savings} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="caption" color={colors.textSoft}>{loan.annualRatePct}% p.a. · {loan.tenureMonths} months</AppText>
                <AppText variant="caption" color={colors.textSoft}>Repaid {formatINR(repaid)}</AppText>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
