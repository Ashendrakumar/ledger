import { ActivityIndicator, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, font, hit } from '@/theme';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'outline' | 'danger' | 'ghost';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  loading?: boolean;
  /** Visual height; the 44px minimum touch target still applies. */
  height?: number;
  style?: StyleProp<ViewStyle>;
}

const look: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.ink, fg: colors.white },
  outline: { bg: colors.white, fg: colors.primary, border: colors.primary },
  danger: { bg: colors.expenseTint, fg: colors.danger },
  ghost: { bg: 'transparent', fg: colors.primary },
};

// Shared press feel everywhere: quick spring down on press-in, springy return with a
// small overshoot on release. Runs on the UI thread via the inner Animated.View.
const PRESS_IN = { damping: 18, stiffness: 420, mass: 0.7 } as const;
const PRESS_OUT = { damping: 13, stiffness: 300, mass: 0.9 } as const;
const PRESSED_SCALE = 0.96;

/**
 * The one action button. For anything that isn't a CTA / action button
 * (list rows, cards, menu items, tab bar, backdrops), use a plain Pressable.
 *
 * Note: the Pressable itself uses only static styles — all animated values live on the
 * inner Animated.View. A style function on an animated Pressable silently drops static
 * visual props on Android's New Architecture (white/transparent buttons).
 */
export function Button({
  label,
  variant = 'primary',
  icon,
  loading,
  height = 52,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: Props) {
  const v = look[variant];
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.45 : interpolate(pressed.value, [0, 1], [1, 0.82]),
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled || loading}
      onPress={(e) => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      onPressIn={(e) => {
        // Reanimated shared values are designed to be mutated outside React render.
        // eslint-disable-next-line react-hooks/immutability
        pressed.value = 1;
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(PRESSED_SCALE, PRESS_IN);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        // eslint-disable-next-line react-hooks/immutability
        pressed.value = 0;
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(1, PRESS_OUT);
        onPressOut?.(e);
      }}
      style={style}
      {...rest}
    >
      <Animated.View
        style={[
          {
            minHeight: Math.max(hit, height),
            borderRadius: 16,
            backgroundColor: v.bg,
            borderWidth: v.border ? 1.5 : 0,
            borderColor: v.border,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 16,
            alignSelf: 'stretch',
          },
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <>
            {icon ? <View style={{ alignItems: 'center', justifyContent: 'center' }}>{icon}</View> : null}
            <AppText
              numberOfLines={1}
              style={{
                fontFamily: font.bold,
                fontSize: 15,
                lineHeight: 20,
                // Android adds built-in font padding which makes text sit high;
                // killing it + an explicit lineHeight centers text exactly.
                includeFontPadding: false,
                textAlignVertical: 'center',
                textAlign: 'center',
              }}
              color={v.fg}
            >
              {label}
            </AppText>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}
