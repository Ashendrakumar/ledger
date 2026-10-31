import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, font, hit } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'outline' | 'danger' | 'ghost';
interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  icon?: React.ReactNode;
  loading?: boolean;
  height?: number;
}

const look: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.ink, fg: colors.white },
  outline: { bg: colors.white, fg: colors.primary, border: colors.primary },
  danger: { bg: colors.expenseTint, fg: colors.danger },
  ghost: { bg: 'transparent', fg: colors.primary },
};

export function Button({ label, variant = 'primary', icon, loading, height = 52, onPress, disabled, style, ...rest }: Props) {
  const v = look[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={(e) => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={(s) => [
        {
          minHeight: Math.max(hit, height), borderRadius: 16, backgroundColor: v.bg,
          borderWidth: v.border ? 1.5 : 0, borderColor: v.border,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
          opacity: disabled ? 0.45 : s.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(s) : style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <>
          {icon ? <View>{icon}</View> : null}
          <AppText style={{ fontFamily: font.bold, fontSize: 15 }} color={v.fg}>{label}</AppText>
        </>
      )}
    </Pressable>
  );
}
