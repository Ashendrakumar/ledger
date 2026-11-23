import { type ReactNode } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

type Props = ScrollViewProps & {
  tabBar?: boolean;
  /** When provided, rendered as a fixed animated header above the scroll content. */
  header?: ReactNode;
};

/** Standard page: safe-area top, 20px gutters, bottom room for the floating tab bar. */
export function Screen({ children, tabBar = true, header, onScroll, scrollEventThrottle, contentContainerStyle, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.value = e.contentOffset.y;
    },
  });

  const headerOverlayStyle = useAnimatedStyle(() => {
    const t = interpolate(y.value, [0, 24], [0, 1], Extrapolation.CLAMP);
    return {
      backgroundColor: `rgba(242,246,244,${interpolate(t, [0, 1], [0.18, 0.52], Extrapolation.CLAMP)})`,
      borderBottomColor: `rgba(226,232,228,${interpolate(t, [0, 1], [0, 0.75], Extrapolation.CLAMP)})`,
      borderBottomWidth: StyleSheet.hairlineWidth,
      shadowColor: '#000',
      shadowOpacity: interpolate(t, [0, 1], [0, 0.05], Extrapolation.CLAMP),
      shadowRadius: interpolate(t, [0, 1], [0, 8], Extrapolation.CLAMP),
      shadowOffset: { width: 0, height: 2 },
      elevation: interpolate(t, [0, 1], [0, 3], Extrapolation.CLAMP),
    };
  });

  const basePaddingTop = insets.top + 12;
  const basePaddingBottom = (tabBar ? 120 : 24) + insets.bottom;

  if (header) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          <Animated.View style={[StyleSheet.absoluteFill, headerOverlayStyle]} />
          <View style={{ paddingTop: basePaddingTop, paddingHorizontal: 14, paddingBottom: 8 }}>
            {header}
          </View>
        </View>
        <Animated.ScrollView
          {...rest}
          onScroll={scrollHandler}
          scrollEventThrottle={scrollEventThrottle ?? 16}
          style={{ flex: 1, backgroundColor: colors.canvas }}
          contentContainerStyle={[
            { paddingTop: basePaddingTop + 64, paddingHorizontal: 14, paddingBottom: basePaddingBottom, gap: 14 },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <Animated.ScrollView
      {...rest}
      onScroll={onScroll ?? scrollHandler}
      scrollEventThrottle={scrollEventThrottle ?? 16}
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={[
        { paddingTop: basePaddingTop, paddingHorizontal: 14, paddingBottom: basePaddingBottom, gap: 14 },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </Animated.ScrollView>
  );
}
