import { Text, type TextProps } from 'react-native';
import { colors, type as t } from '@/theme';

type Variant = keyof typeof t;
interface Props extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AppText({ variant = 'body', color = colors.text, style, ...rest }: Props) {
  return <Text {...rest} style={[t[variant], { color }, style]} />;
}
