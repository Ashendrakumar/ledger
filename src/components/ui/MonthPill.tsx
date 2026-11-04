import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';
import { labelMonth, shiftMonth } from '@/lib/dates';
import { AppText } from './AppText';

function Arrow({ dir, month, onChange }: { dir: -1 | 1; month: string; onChange: (m: string) => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous month' : 'Next month'} onPress={() => onChange(shiftMonth(month, dir))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={dir < 0 ? 'chevron-left' : 'chevron-right'} size={18} color={colors.text} />
    </Pressable>
  );
}

/** Prev / next month control. Tap the arrows to move. */
export function MonthPill({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.borderStrong }}>
      <Arrow dir={-1} month={month} onChange={onChange} />
      <AppText variant="subheading" style={{ minWidth: 76, textAlign: 'center' }}>{labelMonth(month)}</AppText>
      <Arrow dir={1} month={month} onChange={onChange} />
    </View>
  );
}
