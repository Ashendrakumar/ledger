import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';
import { iconFor } from '@/lib/categories';
import { relativeDay } from '@/lib/dates';
import type { Entry } from '@/types';
import { AppText } from './ui/AppText';
import { Money } from './ui/Money';

const TYPE_ICONS = {
  expense: 'shopping-bag',
  income: 'arrow-down-left',
  saving: 'bookmark',
} as const;

/** Resolve colors at render time so badges follow live light/dark theme changes. */
export function typeStyle(type: Entry['type']) {
  if (type === 'expense') return { fg: colors.expense, tint: colors.expenseTint, text: colors.expenseText, sign: -1, icon: TYPE_ICONS.expense };
  if (type === 'income') return { fg: colors.income, tint: colors.incomeTint, text: colors.income, sign: 1, icon: TYPE_ICONS.income };
  return { fg: colors.savings, tint: colors.savingsTint, text: colors.savingsText, sign: -1, icon: TYPE_ICONS.saving };
}

interface Props { entry: Entry; onPress?: () => void; compact?: boolean }

export function EntryRow({ entry, onPress }: Props) {
  const s = typeStyle(entry.type);
  const sub = [entry.category, entry.date ? relativeDay(entry.date) : null].filter(Boolean).join(' · ');
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10 }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: s.tint, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={iconFor(entry.category, entry.type)} size={19} color={s.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subheading" numberOfLines={1}>{entry.note || entry.category}</AppText>
        <AppText variant="caption" color={colors.muted} numberOfLines={1}>{sub}</AppText>
      </View>
      <Money paise={entry.amountPaise * s.sign} sign variant="subheading" color={s.fg} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }} />
    </Pressable>
  );
}
