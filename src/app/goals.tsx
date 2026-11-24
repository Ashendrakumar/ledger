import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { SwipeActions } from '@/components/ui/SwipeActions';
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
    <SwipeActions
      editLabel={`Edit goal ${goal.name}`}
      deleteLabel={`Delete goal ${goal.name}`}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  const openActions = () => {
    Alert.alert(goal.name, 'Choose an action', [
      { text: 'Edit', onPress: onEdit },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 6 }}>
    <ReanimatedSwipeable renderRightActions={actions} overshootRight={false}>
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
                minWidth: 76,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 5,
                paddingHorizontal: 10,
              }}
            >
              <Feather name="plus" size={18} color={colors.primary} />
              <AppText variant="caption" color={colors.primary} style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>Add</AppText>
            </Pressable>
          </View>
        </Card>
      </Pressable>
    </ReanimatedSwipeable>
    </View>
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
            <Button variant="outline" label="Add" accessibilityLabel="Add new goal" icon={<Feather name="plus" size={17} color={colors.text} />} onPress={() => router.push('/goal-new')} height={40} style={{ minWidth: 84 }} />
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
