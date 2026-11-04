import { View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  ratio: number;
  color?: string;
  /** Track (unfilled) color. Defaults to colors.track. */
  track?: string;
  height?: number;
}

/** Horizontal progress track — filled portion in `color`, remainder in `track`. */
export function ProgressBar({ ratio, color = colors.expense, track = colors.track, height = 8 }: Props) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}
