import type { TextProps } from 'react-native';
import { formatINR } from '@/lib/money';
import { useSettings } from '@/store/settings';
import { AppText } from './AppText';

interface Props extends TextProps {
  paise: number;
  sign?: boolean;
  variant?: React.ComponentProps<typeof AppText>['variant'];
  color?: string;
}

/** All amounts go through here so "Hide amounts" works everywhere. */
export function Money({ paise, sign, ...rest }: Props) {
  const hide = useSettings((s) => s.hideAmounts);
  return <AppText {...rest}>{hide ? '₹ ••••' : formatINR(paise, { sign })}</AppText>;
}
