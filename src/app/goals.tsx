import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { useGoals } from '@/store/goals';
import { formatINR, toPaise } from '@/lib/money';
import { fullMonth } from '@/lib/dates';

export default function Goals() {
  const { goals, addMoney } = useGoals();
  const saved = goals.reduce((a, g) => a + g.savedPaise, 0);

  return (
    <Screen tabBar={false}>
      <ScreenHeader title="Goals" back right={<Button label="New goal" height={44} onPress={() => router.push('/goal-new')} icon={<Feather name="plus" size={16} color={colors.mint} />} style={{ paddingHorizontal: 16, borderRadius: 22 }} />} />
      <View style={{ backgroundColor: colors.savingsTint, borderRadius: 22, padding: 16, gap: 2 }}>
        <AppText variant="caption" color={colors.textSoft}>Saved across {goals.length} goals</AppText>
        <Money paise={saved} variant="display" color={colors.savingsText} style={{ fontSize: 30 }} />
      </View>
      {goals.map((g) => (
        <Card key={g.id} style={{ gap: 12, borderRadius: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ProgressRing ratio={g.savedPaise / g.targetPaise} />
            <View style={{ flex: 1 }}>
              <AppText variant="heading" style={{ fontSize: 16 }}>{g.name}</AppText>
              <AppText variant="caption" color={colors.textSoft}>{formatINR(g.savedPaise)} of {formatINR(g.targetPaise)}</AppText>
              <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>Target {fullMonth(g.targetMonth)}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit goal ${g.name}`}
              onPress={() => router.push({ pathname: '/goal-new', params: { id: g.id } })}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="edit-2" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <Button label="Add ₹1,000" variant="outline" height={44} icon={<Feather name="plus" size={16} color={colors.primary} />}
            onPress={() => addMoney(g.id, toPaise(1000))} />
        </Card>
      ))}
    </Screen>
  );
}
