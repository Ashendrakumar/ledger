import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { AppText } from './ui/AppText';
import { Money } from './ui/Money';
import { ProgressBar } from './ui/ProgressBar';
import { formatINR } from '@/lib/money';
import { Sparkline } from './charts/Sparkline';

interface Props {
  label: string; actual: number; planned: number;
  tint: string; fg: string; text: string; onPress: () => void;
  icon: React.ComponentProps<typeof Feather>['name'];
  trend: number[];
  trendMonths: string[];
  change: number;
  increaseIsGood: boolean;
  incomeSharePct: number;
  style?: StyleProp<ViewStyle>;
}

export function PlanActualCard({ label, actual, planned, tint, fg, text, onPress, icon, trend, trendMonths, change, increaseIsGood, incomeSharePct, style }: Props) {
  const ratio = planned ? actual / planned : 0;
  const pct = planned ? Math.min(999, Math.round(ratio * 100)) : 0;
  const favorable = change === 0 || (change > 0) === increaseIsGood;
  const badgeColor = favorable ? fg : colors.danger;
  const planVariance = actual - planned;
  const planFavorable = planVariance === 0 || (planVariance > 0) === increaseIsGood;
  const planColor = planFavorable ? fg : colors.danger;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} breakdown, ${pct}% of plan used`} onPress={onPress}
      style={[{ backgroundColor: tint, borderRadius: radius.card, padding: 12, gap: 7, justifyContent: 'space-between', minHeight: 164, overflow: 'hidden' }, style]}>
      <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name={icon} size={15} color={fg} />
          <AppText variant="subheading" color={text}>{label}</AppText>
        </View>
        <View accessibilityLabel={`${change >= 0 ? 'Up' : 'Down'} ${formatINR(Math.abs(change))} from last month`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${badgeColor}1A`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Feather name={change >= 0 ? 'trending-up' : 'trending-down'} size={12} color={badgeColor} />
          <AppText variant="caption" color={badgeColor} style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10 }}>{formatINR(Math.abs(change))}</AppText>
        </View>
      </View>
      <View style={{ gap: 0 }}>
        <Money paise={actual} variant="heading" color={fg} />
        <AppText variant="caption" color={colors.textSoft} numberOfLines={1}>of {formatINR(planned)}</AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <AppText variant="caption" color={planColor} style={{ fontSize: 11 }} numberOfLines={1}>
          {planVariance === 0 ? 'On plan' : `${formatINR(Math.abs(planVariance))} ${planVariance > 0 ? 'over' : 'under'} plan`}
        </AppText>
        <AppText variant="caption" color={fg} style={{ fontSize: 11 }} numberOfLines={1}>{incomeSharePct}% of income</AppText>
      </View>
      <View style={{ gap: 2 }}>
        <Sparkline values={trend} height={28} color={fg} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
          {trendMonths.map((month, index) => <AppText key={`${month}-${index}`} variant="caption" color={colors.textSoft} style={{ fontSize: 9 }}>{month}</AppText>)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <ProgressBar ratio={ratio} color={fg} track="rgba(16,32,28,0.12)" height={6} />
        </View>
        <AppText variant="caption" color={fg} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{pct}%</AppText>
      </View>
    </Pressable>
  );
}
