import { useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { aggregateLoans } from '@/lib/emi';
import { useLoans } from '@/store/loans';
import { colors } from '@/theme';

interface Props {
  overdueCount?: number;
}

export function ProfileMenuButton({ overdueCount: providedOverdueCount }: Props) {
  const { loans, payments } = useLoans();
  const overdueCount = useMemo(
    () => providedOverdueCount ?? aggregateLoans(loans, payments).overdue,
    [providedOverdueCount, loans, payments],
  );

  const openNotifications = () => {
    if (overdueCount > 0) {
      Alert.alert('EMI reminder', `${overdueCount} loan instalment${overdueCount === 1 ? ' is' : 's are'} overdue.`, [
        { text: 'Later', style: 'cancel' },
        { text: 'View loans', onPress: () => router.push('/loans') },
      ]);
    } else {
      Alert.alert('All caught up', 'No overdue EMIs or alerts right now.');
    }
  };

  const openMenu = () => {
    Alert.alert('Quick actions', undefined, [
      { text: 'Notifications', onPress: openNotifications },
      { text: 'Settings', onPress: () => router.push('/settings') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={overdueCount > 0 ? `Profile menu, ${overdueCount} overdue EMI alert${overdueCount === 1 ? '' : 's'}` : 'Profile menu'}
      accessibilityHint="Open Notifications and Settings"
      onPress={openMenu}
      style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
    >
      <Feather name="user" size={19} color={colors.white} />
      {overdueCount > 0 ? (
        <View style={{ position: 'absolute', top: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.canvas }} />
      ) : null}
    </Pressable>
  );
}
