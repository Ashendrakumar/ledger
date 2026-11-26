import { Pressable } from 'react-native';
import { colors } from '@/theme';
import type { Entry } from '@/types';
import { AppText } from './ui/AppText';
import { Money } from './ui/Money';

interface Props {
  entry: Entry;
  onPress?: () => void;
}

export function AccumulatedEntryRow({ entry, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}
    >
      <AppText variant="body" style={{ fontSize: 14 }}>{entry.category}</AppText>
      <Money paise={entry.amountPaise} variant="subheading" style={{ fontSize: 14 }} />
    </Pressable>
  );
}
