import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { AppText } from '../ui/AppText';
import { colors } from '@/theme';
import { useSettings } from '@/store/settings';

export const DONUT_COLORS = ['#7A2E06', '#B8460A', '#E07A3A', '#F2A878', '#F8CDAE', '#FBE6D6'];

export function Donut({ values, size = 140, stroke = 22, centerTop, centerBottom }: { values: number[]; size?: number; stroke?: number; centerTop: string; centerBottom: string }) {
  // Donut is all-INR; when amounts are hidden, mask the center like <Money> does.
  const hide = useSettings((s) => s.hideAmounts);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  // Cumulative start offset of each slice, computed once so the render loop
  // does not reassign accumulators while rendering.
  const starts = values.reduce<number[]>((acc, _v, i) => {
    acc.push((acc[acc.length - 1] ?? 0) + ((values[i - 1] ?? 0) / total) * c);
    return acc;
  }, []);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`} fill="none" strokeWidth={stroke}>
          {values.map((v, i) => {
            const len = (v / total) * c;
            return (
              <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-starts[i]} />
            );
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <AppText variant="subheading" style={{ fontSize: 16 }}>{hide ? '₹ ••••' : centerTop}</AppText>
        <AppText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>{hide ? 'Hidden' : centerBottom}</AppText>
      </View>
    </View>
  );
}
