import { View } from 'react-native';
import { colors } from '@/theme';

export function ProgressBar({ ratio, color = colors.expense }: { ratio: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.track }}>
      <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}
