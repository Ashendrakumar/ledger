import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/theme';
import { ProfileMenuButton } from '@/components/ProfileMenuButton';
import { AppText } from './AppText';

interface Props { title: string; back?: boolean; onBackPress?: () => void; right?: React.ReactNode; subtitle?: string; icon?: React.ComponentProps<typeof Feather>['name']; showProfile?: boolean }

export function ScreenHeader({ title, back, onBackPress, right, subtitle, icon, showProfile = true }: Props) {
  return (
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBackPress ?? (() => router.back())} style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-left" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        {icon ? <Feather name={icon} size={20} color={colors.expense} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="title" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{title}</AppText>
          {subtitle ? <AppText variant="caption" color={colors.muted} style={{ marginTop: 2 }} numberOfLines={1}>{subtitle}</AppText> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {right}
        {showProfile ? <ProfileMenuButton /> : null}
      </View>
    </View>
  );
}
