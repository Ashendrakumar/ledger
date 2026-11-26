import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font } from '@/theme';
import { iconFor } from '@/lib/categories';
import { relativeDay } from '@/lib/dates';
import { typeStyle } from '@/components/EntryRow';
import type { Entry } from '@/types';
import { AppText } from './ui/AppText';
import { Money } from './ui/Money';

interface Props {
  entry: Entry;
  onPress?: () => void;
}

export function EntryCardRow({ entry, onPress }: Props) {
  const style = typeStyle(entry.type);
  const typeLabel = entry.type === 'expense' ? 'Expense' : entry.type === 'income' ? 'Income' : 'Savings';
  const details = [
    entry.category,
    typeLabel,
    entry.date ? relativeDay(entry.date) : null,
  ].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: style.tint, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={iconFor(entry.category, entry.type)} size={19} color={style.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="subheading" numberOfLines={1} style={{ fontSize: 14, fontFamily: font.medium }}>{entry.note || entry.category}</AppText>
        <AppText variant="caption" color={colors.muted} numberOfLines={1} style={{ fontSize: 11 }}>{details}</AppText>
      </View>
      <Money
        paise={entry.amountPaise * style.sign}
        sign
        variant="body"
        color={style.fg}
        numberOfLines={1}
        style={{ fontSize: 14, fontFamily: font.semibold }}
      />
    </Pressable>
  );
}
