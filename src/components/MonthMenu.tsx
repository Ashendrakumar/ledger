import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { fullMonth, monthKey, shiftMonth } from '@/lib/dates';
import { AppText } from './ui/AppText';

interface Props {
  visible: boolean;
  month: string;
  onChange: (m: string) => void;
  onClose: () => void;
}

/** Anchored month picker — floats just under the header's month label. No close button; tap anywhere else to dismiss. */
export function MonthMenu({ visible, month, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const now = monthKey(new Date());
  // 3 years back through next quarter, newest first.
  const months = Array.from({ length: 40 }, (_, i) => shiftMonth(now, 3 - i));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel="Close month picker" onPress={onClose}
        style={{ flex: 1 }} />
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 56, left: 64, right: 16 }}>
        <View
          style={{
            width: 252, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border,
            paddingVertical: 6, overflow: 'hidden',
            shadowColor: '#0E1A17', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14,
          }}
        >
          <AppText variant="label" color={colors.muted} style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4, fontSize: 11 }}>JUMP TO MONTH</AppText>
          <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {months.map((m) => {
              const selected = m === month;
              return (
                <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { onChange(m); onClose(); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    paddingHorizontal: 14, paddingVertical: 10,
                    backgroundColor: selected ? colors.incomeTint : 'transparent',
                  }}>
                  <AppText variant="body" color={selected ? colors.income : colors.text} style={{ fontSize: 14 }} numberOfLines={1}>
                    {fullMonth(m)}{m === now ? ' · Now' : ''}
                  </AppText>
                  {selected ? <Feather name="check" size={16} color={colors.income} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
