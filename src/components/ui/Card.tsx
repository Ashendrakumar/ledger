import { View, type ViewProps } from 'react-native';
import { colors, radius } from '@/theme';

export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 16 },
        style,
      ]}
    />
  );
}
