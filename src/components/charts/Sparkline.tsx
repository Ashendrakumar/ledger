import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/theme';

export function Sparkline({ values, width = 300, height = 44, color = colors.mint }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => [pad + (i * (width - pad * 2)) / (values.length - 1), pad + (1 - (v - min) / span) * (height - pad * 2)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Balance trend over the last months">
      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={4} fill={color} />
    </Svg>
  );
}
