import { useMemo } from 'react';
import { Alert, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { MonthPill } from '@/components/ui/MonthPill';
import { TYPE_STYLE } from '@/components/EntryRow';
import { Pressable } from 'react-native';
import { useEntries } from '@/store/entries';
import { useUi } from '@/store/ui';
import { total, inMonth } from '@/lib/selectors';
import { fullMonth, shiftMonth } from '@/lib/dates';
import type { EntryType } from '@/types';

const GROUPS: { type: EntryType; title: string }[] = [
  { type: 'income', title: 'Income' }, { type: 'expense', title: 'Expenses' }, { type: 'saving', title: 'Savings' },
];

export default function Plan() {
  const { entries, copyPlanFromPrevious } = useEntries();
  const { month, setMonth } = useUi();
  const planned = useMemo(() => inMonth(entries, month, 'planned'), [entries, month]);
  const t = (type: EntryType) => total(entries, month, 'planned', type);
  const left = t('income') - t('expense') - t('saving');
  const prev = shiftMonth(month, -1);

  const copy = () => {
    if (planned.length) {
      Alert.alert('Add last month\'s plan?', `${fullMonth(prev)} planned entries will be added to ${fullMonth(month)}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy', onPress: () => copyPlanFromPrevious(month) },
      ]);
    } else copyPlanFromPrevious(month);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">Plan</AppText>
        <MonthPill month={month} onChange={setMonth} />
      </View>

      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {GROUPS.map((g) => (
            <View key={g.type} style={{ flex: 1 }}>
              <AppText variant="caption" color={colors.onInkMuted} style={{ fontSize: 12 }}>{g.title}</AppText>
              <Money paise={t(g.type)} variant="subheading" color={colors.white} style={{ fontSize: 17 }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 }}>
          <AppText variant="caption" color={colors.onInkMuted}>Left to allocate</AppText>
          <View style={{ backgroundColor: 'rgba(95,211,181,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Money paise={left} variant="subheading" color={left < 0 ? '#FF9C8F' : colors.mint} />
          </View>
        </View>
      </View>

      <Button variant="outline" label={`Copy plan from ${fullMonth(prev)}`} icon={<Feather name="copy" size={18} color={colors.primary} />} onPress={copy} />

      {GROUPS.map((g) => {
        const rows = planned.filter((e) => e.type === g.type);
        const s = TYPE_STYLE[g.type];
        return (
          <Card key={g.type} style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ height: 36, paddingHorizontal: 16, backgroundColor: s.tint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label" color={s.text} style={{ fontSize: 13 }}>{g.title}</AppText>
              <Money paise={t(g.type)} variant="label" color={s.text} style={{ fontSize: 13 }} />
            </View>
            {rows.length === 0 ? <View style={{ padding: 16 }}><AppText color={colors.muted} variant="caption">Nothing planned.</AppText></View> : rows.map((e, i) => (
              <Pressable key={e.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/add', params: { id: e.id } })}
                style={{ minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <AppText variant="body" style={{ fontSize: 14 }}>{e.category}</AppText>
                <Money paise={e.amountPaise} variant="subheading" style={{ fontSize: 14 }} />
              </Pressable>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
