import { Switch } from 'react-native';
import { colors } from '@/theme';

export function Toggle({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.switchOff, true: colors.primary }}
      thumbColor={colors.white}
    />
  );
}
