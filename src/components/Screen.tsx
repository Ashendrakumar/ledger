import { type ReactNode } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

type Props = ScrollViewProps & {
  tabBar?: boolean;
  /** When provided, rendered as the first section of the scrollable content (not fixed while scrolling). */
  header?: ReactNode;
};

/** Standard page: safe-area top, consistent 16px gutters, bottom room for the floating tab bar. */
export function Screen({ children, tabBar = true, header, onScroll, scrollEventThrottle, contentContainerStyle, ...rest }: Props) {
  const insets = useSafeAreaInsets();

  const basePaddingTop = insets.top + 12;
  const basePaddingBottom = (tabBar ? 120 : 24) + insets.bottom;

  return (
    <ScrollView
      {...rest}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle ?? 16}
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={[
        { paddingTop: basePaddingTop, paddingHorizontal: 16, paddingBottom: basePaddingBottom, gap: 14 },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      {children}
    </ScrollView>
  );
}
