import { Pressable, View } from 'react-native';
import { colors, radius } from '@/theme';
import { AppText } from './ui/AppText';
import { Money } from './ui/Money';
import { ProgressBar } from './ui/ProgressBar';

interface Props {
  label: string; actual: number; planned: number;
  tint: string; fg: string; text: string; onPress: () => void;
}

export function PlanActualCard({ label, actual, planned, tint, fg, text, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} breakdown`} onPress={onPress}
      style={{ backgroundColor: tint, borderRadius: radius.card, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="subheading" color={text}>{label}</AppText>
        <AppText variant="caption" color={colors.textSoft}>Planned <Money paise={planned} variant="caption" color={colors.textSoft} /></AppText>
      </View>
      <Money paise={actual} variant="heading" color={fg} />
      <ProgressBar ratio={planned ? actual / planned : 0} color={fg} />
    </Pressable>
  );
}
