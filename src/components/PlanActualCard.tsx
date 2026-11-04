import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { AppText } from './ui/AppText';
import { Money } from './ui/Money';
import { ProgressBar } from './ui/ProgressBar';
import { formatINR } from '@/lib/money';

interface Props {
  label: string; actual: number; planned: number;
  tint: string; fg: string; text: string; onPress: () => void;
  icon: React.ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
}

export function PlanActualCard({ label, actual, planned, tint, fg, text, onPress, icon, style }: Props) {
  const ratio = planned ? actual / planned : 0;
  const pct = planned ? Math.min(999, Math.round(ratio * 100)) : 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} breakdown, ${pct}% of plan used`} onPress={onPress}
      style={[{ backgroundColor: tint, borderRadius: radius.card, padding: 14, gap: 8, justifyContent: 'space-between' }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name={icon} size={15} color={fg} />
          <AppText variant="subheading" color={text}>{label}</AppText>
        </View>
        <AppText variant="caption" color={fg} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{pct}%</AppText>
      </View>
      <View style={{ gap: 0 }}>
        <Money paise={actual} variant="heading" color={fg} />
        <AppText variant="caption" color={colors.textSoft} numberOfLines={1}>of {formatINR(planned)}</AppText>
      </View>
      <ProgressBar ratio={ratio} color={fg} track="rgba(16,32,28,0.12)" height={6} />
    </Pressable>
  );
}
