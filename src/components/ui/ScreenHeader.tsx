import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/theme';
import { AppText } from './AppText';

interface Props { title: string; back?: boolean; right?: React.ReactNode }

export function ScreenHeader({ title, back, right }: Props) {
  return (
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-left" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <AppText variant="title" accessibilityRole="header">{title}</AppText>
      </View>
      {right}
    </View>
  );
}
