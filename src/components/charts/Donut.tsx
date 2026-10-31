import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { AppText } from '../ui/AppText';
import { colors } from '@/theme';

export const DONUT_COLORS = ['#7A2E06', '#B8460A', '#E07A3A', '#F2A878', '#F8CDAE', '#FBE6D6'];

export function Donut({ values, size = 140, stroke = 22, centerTop, centerBottom }: { values: number[]; size?: number; stroke?: number; centerTop: string; centerBottom: string }) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`} fill="none" strokeWidth={stroke}>
          {values.map((v, i) => {
            const len = (v / total) * c;
            const el = <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <AppText variant="subheading" style={{ fontSize: 16 }}>{centerTop}</AppText>
        <AppText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>{centerBottom}</AppText>
      </View>
    </View>
  );
}
