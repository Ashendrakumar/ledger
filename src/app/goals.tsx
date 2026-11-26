import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors, radius } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
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
  const target = goals.reduce((a, g) => a + g.targetPaise, 0);
  const activeGoals = goals.filter((g) => g.savedPaise < g.targetPaise).length;

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
          showProfile={false}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel="Add new goal" onPress={() => router.push('/goal-new')}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="plus" size={19} color={colors.white} />
            </Pressable>
          }
        />
      }
    >
      {goals.length === 0 ? (
        <EmptyState
          title="Start your first goal"
          description="Create a savings goal and track your progress along the way."
          actionLabel="Add goal"
          onAction={() => router.push('/goal-new')}
        />
      ) : (
      <>
      <View style={{ backgroundColor: colors.ink, borderRadius: radius.hero, padding: 18, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color={colors.onInkMuted}>Saved across {goals.length} goals</AppText>
            <Money paise={saved} variant="display" color={colors.white} style={{ fontSize: 30 }} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <AppText variant="caption" color={colors.onInkMuted}>GOAL TARGET</AppText>
            <Money paise={target} variant="subheading" color={colors.mint} />
          </View>
        </View>
        <ProgressBar ratio={target ? saved / target : 0} color={colors.mint} track="rgba(255,255,255,0.15)" height={5} />
        <AppText variant="caption" color={colors.onInkMuted}>
          {`${activeGoals} active · ${goals.length} total`}
        </AppText>
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
      </>
      )}
    </Screen>
  );
}
