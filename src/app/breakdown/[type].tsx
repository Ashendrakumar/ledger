import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme';
import { Sheet } from '@/components/ui/Sheet';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TYPE_STYLE } from '@/components/EntryRow';
import { useEntries } from '@/store/entries';
import { useUi } from '@/store/ui';
import { byCategory } from '@/lib/selectors';
import { iconFor } from '@/lib/categories';
import { fullMonth } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import type { EntryType } from '@/types';

const TITLES: Record<EntryType, string> = { expense: 'Expenses', income: 'Income', saving: 'Savings' };

export default function Breakdown() {
  const { type: raw } = useLocalSearchParams<{ type: string }>();
  const type = (['expense', 'income', 'saving'].includes(raw) ? raw : 'expense') as EntryType;
  const entries = useEntries((s) => s.entries);
  const month = useUi((s) => s.month);
  const s = TYPE_STYLE[type];

  const rows = useMemo(() => byCategory(entries, month, type), [entries, month, type]);
  const planned = rows.reduce((a, r) => a + r.planned, 0);
  const actual = rows.reduce((a, r) => a + r.actual, 0);

  return (
    <Sheet>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" style={{ fontSize: 22 }}>{TITLES[type]}</AppText>
          <AppText variant="caption" color={colors.muted}>{fullMonth(month)} · planned vs actual by category</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="x" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
        <View style={{ flex: 1, backgroundColor: colors.canvas, borderRadius: 16, padding: 12 }}>
          <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Planned</AppText>
          <Money paise={planned} variant="heading" />
        </View>
        <View style={{ flex: 1, backgroundColor: s.tint, borderRadius: 16, padding: 12 }}>
          <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Actual</AppText>
          <Money paise={actual} variant="heading" color={s.fg} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
        {rows.length === 0 ? <AppText color={colors.muted} style={{ paddingVertical: 20 }}>Nothing recorded for this month.</AppText> : null}
        {rows.map((r) => {
          // Expenses and savings are "over" when actual exceeds plan; income is "short" when it falls under.
          const over = type !== 'income' && r.planned > 0 && r.actual > r.planned;
          const diff = r.planned - r.actual;
          const bar = over ? colors.danger : s.fg;
          const status = over ? `▲ ${formatINR(-diff)} over budget` : r.planned === 0 ? 'Not planned' : diff === 0 ? 'On plan' : `${formatINR(Math.abs(diff))} ${diff > 0 ? (type === 'income' ? 'to go' : 'left') : 'ahead'}`;
          return (
            <View key={r.category} style={{ gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: s.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={iconFor(r.category, type)} size={17} color={s.fg} />
                </View>
                <AppText variant="subheading" style={{ flex: 1 }}>{r.category}</AppText>
                <Money paise={r.actual} variant="subheading" color={over ? colors.danger : s.fg} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }} />
              </View>
              <ProgressBar ratio={r.planned ? r.actual / r.planned : r.actual ? 1 : 0} color={bar} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Planned {formatINR(r.planned)}</AppText>
                <AppText variant="caption" color={over ? colors.danger : colors.textSoft} style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>{status}</AppText>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ marginTop: 12 }}><Button label="Done" height={54} onPress={() => router.back()} /></View>
    </Sheet>
  );
}
