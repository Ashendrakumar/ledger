import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/theme';
import { AppText } from './AppText';

interface Props { title: string; back?: boolean; right?: React.ReactNode; subtitle?: string }

export function ScreenHeader({ title, back, right, subtitle }: Props) {
  return (
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-left" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <AppText variant="title" accessibilityRole="header">{title}</AppText>
          {subtitle ? <AppText variant="caption" color={colors.muted} style={{ marginTop: 2 }}>{subtitle}</AppText> : null}
        </View>
      </View>
      {right}
    </View>
  );
}
