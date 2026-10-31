import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '@/theme';
import { AppText } from '../ui/AppText';

export function ProgressRing({ ratio, size = 64, stroke = 8, color = colors.savings }: { ratio: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${Math.round(pct * 100)} percent`}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`} fill="none" strokeWidth={stroke} strokeLinecap="round">
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeDasharray={`${c * pct} ${c}`} />
        </G>
      </Svg>
      <View style={{ position: 'absolute' }}><AppText variant="subheading">{Math.round(pct * 100)}%</AppText></View>
    </View>
  );
}
