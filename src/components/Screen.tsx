import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

/** Standard page: safe-area top, 20px gutters, bottom room for the floating tab bar. */
export function Screen({ children, tabBar = true, ...rest }: ScrollViewProps & { tabBar?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      {...rest}
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: (tabBar ? 120 : 24) + insets.bottom, gap: 14 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
