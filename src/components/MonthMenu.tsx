import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, isDark, radius } from '@/theme';
import { fullMonth, monthKey, shiftMonth } from '@/lib/dates';
import { AppText } from './ui/AppText';

interface Props {
  visible: boolean;
  month: string;
  onChange: (m: string) => void;
  onClose: () => void;
}

function dateForMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1, 12);
}

function lastDayOfMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0, 12);
}

function NativeIOSMonthPicker({ visible, month, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(() => dateForMonth(month));
  const now = monthKey(new Date());
  const minimumDate = dateForMonth(shiftMonth(now, -36));
  const maximumDate = lastDayOfMonth(shiftMonth(now, 3));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close month picker" onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <View style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16),
        }}>
          <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minWidth: 64, minHeight: 44, justifyContent: 'center' }}>
              <AppText variant="subheading" color={colors.muted}>Cancel</AppText>
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="subheading">Choose month</AppText>
              <AppText variant="caption" color={colors.muted}>{fullMonth(monthKey(date))}</AppText>
            </View>
            <Pressable accessibilityRole="button" onPress={() => { onChange(monthKey(date)); onClose(); }}
              style={{ minWidth: 64, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
              <AppText variant="subheading" color={colors.primary}>Done</AppText>
            </Pressable>
          </View>
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant={isDark() ? 'dark' : 'light'}
            textColor={colors.text}
            onValueChange={(_event, selectedDate) => setDate(selectedDate)}
          />
        </View>
      </View>
    </Modal>
  );
}

/** Uses the native date picker on mobile; web keeps a scrollable month list. */
export function MonthMenu({ visible, month, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const latest = useRef({ month, onChange, onClose });
  const now = monthKey(new Date());
  const months = Array.from({ length: 40 }, (_, i) => shiftMonth(now, 3 - i));

  useEffect(() => {
    latest.current = { month, onChange, onClose };
  }, [month, onChange, onClose]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const currentMonth = latest.current.month;
    const currentNow = monthKey(new Date());
    DateTimePickerAndroid.open({
      value: dateForMonth(currentMonth),
      mode: 'date',
      minimumDate: dateForMonth(shiftMonth(currentNow, -36)),
      maximumDate: lastDayOfMonth(shiftMonth(currentNow, 3)),
      onValueChange: (_event, selectedDate) => {
        latest.current.onChange(monthKey(selectedDate));
        latest.current.onClose();
      },
      onDismiss: () => latest.current.onClose(),
    });
  }, [visible]);

  if (Platform.OS === 'android') return null;
  if (Platform.OS === 'ios') {
    return visible ? <NativeIOSMonthPicker visible={visible} month={month} onChange={onChange} onClose={onClose} /> : null;
  }

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
