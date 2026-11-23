import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { useGoals } from '@/store/goals';
import { formatINR, toPaise } from '@/lib/money';
import { fullMonth } from '@/lib/dates';
import type { Goal } from '@/types';

function GoalCard({
  goal,
  onAdd,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const actions = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit goal ${goal.name}`}
        onPress={onEdit}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.canvas,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="edit-2" size={18} color={colors.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete goal ${goal.name}`}
        onPress={onDelete}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.expenseTint,
          borderWidth: 1,
          borderColor: colors.danger,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="trash-2" size={18} color={colors.danger} />
      </Pressable>
    </View>
  );

  const openActions = () => {
    Alert.alert(goal.name, 'Choose an action', [
      { text: 'Edit', onPress: onEdit },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Swipeable renderLeftActions={actions} renderRightActions={actions} overshootLeft={false} overshootRight={false}>
      <Pressable onLongPress={openActions} delayLongPress={350}>
        <Card style={{ borderRadius: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ProgressRing ratio={goal.savedPaise / goal.targetPaise} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="heading" style={{ fontSize: 16 }}>
                {goal.name}
              </AppText>
              <AppText variant="caption" color={colors.textSoft}>
                {formatINR(goal.savedPaise)} of {formatINR(goal.targetPaise)}
              </AppText>
              <AppText variant="caption" color={colors.muted} style={{ fontSize: 12 }}>
                Target {fullMonth(goal.targetMonth)}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add ₹1,000 to ${goal.name}`}
              onPress={onAdd}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="plus" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );
}

export default function Goals() {
  const { goals, addMoney, remove } = useGoals();
  const saved = goals.reduce((a, g) => a + g.savedPaise, 0);

  const confirmDelete = (goal: Goal) => {
    Alert.alert('Delete this goal?', `"${goal.name}" and its progress will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(goal.id) },
    ]);
  };

  return (
    <Screen
      tabBar={false}
      header={
        <ScreenHeader
          title="Goals"
          back
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add new goal"
              onPress={() => router.push('/goal-new')}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="plus" size={18} color={colors.mint} />
            </Pressable>
          }
        />
      }
    >
      <View style={{ backgroundColor: colors.savingsTint, borderRadius: 22, padding: 16, gap: 2 }}>
        <AppText variant="caption" color={colors.textSoft}>
          Saved across {goals.length} goals
        </AppText>
        <Money paise={saved} variant="display" color={colors.savingsText} style={{ fontSize: 30 }} />
      </View>
      <View style={{ gap: 12 }}>
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onAdd={() => addMoney(g.id, toPaise(1000))}
            onEdit={() => router.push({ pathname: '/goal-new', params: { id: g.id } })}
            onDelete={() => confirmDelete(g)}
          />
        ))}
      </View>
    </Screen>
  );
}
