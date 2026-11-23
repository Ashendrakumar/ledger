import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { colors, isDark } from '@/theme';
import { AppText } from './AppText';
import { monthKey } from '@/lib/dates';

const toISODate = (value: Date) => `${monthKey(value)}-${String(value.getDate()).padStart(2, '0')}`;

export function DateField({ value, onChange, accessibilityLabel = 'Choose date', invalid = false }: {
  value: string;
  onChange: (date: string) => void;
  accessibilityLabel?: string;
  invalid?: boolean;
}) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date();
  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: date, mode: 'date', onValueChange: (_event, selected) => onChange(toISODate(selected)) });
    } else {
      setPickerVisible((visible) => !visible);
    }
  };

  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${accessibilityLabel}, ${value}`} onPress={openPicker}
        style={{ minHeight: 48, borderRadius: 14, backgroundColor: colors.canvas, borderWidth: 1, borderColor: invalid ? colors.danger : colors.borderStrong, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="body" color={colors.text}>{value}</AppText>
        <Feather name="calendar" size={18} color={colors.muted} />
      </Pressable>
      {Platform.OS === 'ios' && pickerVisible ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          themeVariant={isDark() ? 'dark' : 'light'}
          onValueChange={(_event, selected) => onChange(toISODate(selected))}
          onDismiss={() => setPickerVisible(false)}
        />
      ) : null}
    </View>
  );
}
