import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { Money } from '@/components/ui/Money';

interface Props {
  title: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  totalPaise: number;
  tint: string;
  text: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function EntrySectionHeader({ title, icon, totalPaise, tint, text, collapsed, onToggle }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      accessibilityLabel={`${title} section, ${collapsed ? 'expand' : 'collapse'}`}
      onPress={onToggle}
      style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: tint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Feather name={icon} size={16} color={text} />
        <AppText variant="label" color={text} style={{ fontSize: 14 }}>{title}</AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Money paise={totalPaise} variant="label" color={text} style={{ fontSize: 13 }} />
        <Feather name={collapsed ? 'chevron-right' : 'chevron-down'} size={17} color={text} />
      </View>
    </Pressable>
  );
}
