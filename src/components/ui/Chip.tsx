import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font } from '@/theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  selected?: boolean;
  tint?: string;
  tintText?: string;
  icon?: React.ReactNode;
  /** Pill height; smaller heights shrink the text/icon accordingly. */
  height?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Chip({ label, selected, tint = colors.ink, tintText = colors.white, icon, height, style, onPress }: Props) {
  const h = height ?? 44;
  const small = h < 44;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={(s) => [
        {
          height: h,
          paddingHorizontal: small ? 10 : 16,
          borderRadius: h / 2,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: small ? 4 : 6,
          backgroundColor: selected ? tint : colors.white,
          borderWidth: selected ? 0 : 1,
          borderColor: colors.borderStrong,
          transform: [{ scale: s.pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <View style={{ alignItems: 'center', justifyContent: 'center' }}>{icon}</View> : null}
      <AppText style={{ fontFamily: selected ? font.bold : font.semibold, fontSize: small ? 12 : 14 }} color={selected ? tintText : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}
