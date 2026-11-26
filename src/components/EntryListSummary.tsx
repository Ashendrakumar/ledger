import { View } from 'react-native';
import { colors } from '@/theme';
import { formatINR } from '@/lib/money';
import { AppText } from './ui/AppText';

interface Props {
  label: string;
  count: number;
  totalPaise: number;
}

export function EntryListSummary({ label, count, totalPaise }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <AppText variant="caption" color={colors.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
        {label} · {count} {count === 1 ? 'entry' : 'entries'}
      </AppText>
      <AppText variant="subheading" numberOfLines={1}>{formatINR(totalPaise)}</AppText>
    </View>
  );
}
