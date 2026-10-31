import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { colors, font } from '@/theme';

export interface BarGroup { label: string; a: number; b: number }

/** Two bars per month: a = income, b = expense. */
export function BarChart({ data, height = 130 }: { data: BarGroup[]; height?: number }) {
  const W = 310, base = height - 18, top = 8;
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1);
  const slot = W / data.length;
  const h = (v: number) => (v / max) * (base - top);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} accessibilityLabel="Income and expenses by month">
      <Line x1={0} y1={base} x2={W} y2={base} stroke={colors.borderStrong} strokeWidth={1} />
      {data.map((d, i) => {
        const x = i * slot + slot / 2;
        return (
          <G key={d.label}>
            <Rect x={x - 16} y={base - h(d.a)} width={14} height={h(d.a)} rx={3} fill={colors.income} />
            <Rect x={x + 2} y={base - h(d.b)} width={14} height={h(d.b)} rx={3} fill={colors.expense} />
            <SvgText x={x} y={height - 3} fontSize={11} fill={colors.muted} textAnchor="middle" fontFamily={font.medium}>{d.label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
