import { Pressable } from 'react-native';
import { colors, font } from '@/theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  selected?: boolean;
  tint?: string;
  tintText?: string;
  onPress?: () => void;
}

export function Chip({ label, selected, tint = colors.ink, tintText = colors.white, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={(s) => [
        {
          height: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
          backgroundColor: selected ? tint : colors.white,
          borderWidth: selected ? 0 : 1, borderColor: colors.borderStrong,
          transform: [{ scale: s.pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <AppText style={{ fontFamily: selected ? font.bold : font.semibold, fontSize: 14 }} color={selected ? tintText : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}
