import { Pressable, View } from 'react-native';
import { colors, font } from '@/theme';
import { AppText } from './AppText';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.border, borderRadius: 14, padding: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.ink : 'transparent' }}
          >
            <AppText style={{ fontFamily: on ? font.bold : font.semibold, fontSize: 14 }} color={on ? colors.white : colors.textSoft}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
