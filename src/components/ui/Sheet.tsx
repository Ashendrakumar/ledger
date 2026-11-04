import { Pressable, useWindowDimensions, View, type ViewProps } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '@/theme';
import type { ReactNode } from 'react';

/**
 * Normal full-width bottom sheet with a draggable handle on top and a tap-to-dismiss
 * transparent backdrop — the page behind stays visible.
 * Drag the handle down to dismiss; release below the threshold or flick fast and the
 * sheet slides away, otherwise it springs back into place.
 * Pass `footer` to pin a 50/50 action row (e.g. <SheetActions />) at the bottom.
 */
export function Sheet({ children, footer, style, maxHeight = '92%' }: ViewProps & { footer?: ReactNode; maxHeight?: `${number}%` }) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useSharedValue(0);

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((e) => {
      // Upwards gets a rubber-band resistance; downwards tracks the finger 1:1.
      translateY.value = e.translationY < 0 ? e.translationY * 0.25 : e.translationY;
    })
    .onEnd((e) => {
      if (translateY.value > 110 || e.velocityY > 650) {
        translateY.value = withTiming(screenHeight, { duration: 200 }, (finished) => {
          if (finished) runOnJS(dismiss)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 260, mass: 0.9 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Handle breathes wider and darker while dragging so it reads as grabbable.
  const handleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(translateY.value, [0, 140], [colors.switchOff, colors.muted]),
    transform: [{ scaleX: interpolate(translateY.value, [0, 140], [1, 1.45], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => router.back()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Animated.View
        style={[
          { maxHeight, width: '100%', backgroundColor: colors.white, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16), overflow: 'hidden' },
          style,
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View
            hitSlop={{ top: 10, bottom: 14, left: 80, right: 80 }}
            style={{ alignSelf: 'stretch', alignItems: 'center', paddingTop: 10, paddingBottom: 14 }}
          >
            <Animated.View style={[{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.switchOff }, handleStyle]} />
          </View>
        </GestureDetector>
        {children}
        {footer ? <View style={{ marginTop: 12 }}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}
