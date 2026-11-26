import { FlatList, Pressable, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font } from '@/theme';
import { Chip } from '@/components/ui/Chip';
import { typeStyle } from '@/components/EntryRow';
import type { EntryType } from '@/types';

const FILTERS: { value: EntryType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'saving', label: 'Savings' },
];

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  filter: EntryType | 'all';
  onFilterChange: (filter: EntryType | 'all') => void;
  accumulated: boolean;
  onToggleAccumulated: () => void;
}

export function EntryListControls({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  accumulated,
  onToggleAccumulated,
}: Props) {
  return (
    <>
      <View style={{ height: 48, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 4 }}>
        <Feather name="search" size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search entries by category, note or amount"
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search category, note or amount"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accumulated ? 'Show entries' : 'Show accumulated view'}
          accessibilityHint={accumulated ? 'Switch to the entry list' : 'Switch to summaries grouped by type'}
          onPress={onToggleAccumulated}
          style={{ width: 42, height: 40, borderLeftWidth: 1, borderLeftColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name={accumulated ? 'list' : 'bar-chart-2'} size={19} color={colors.primary} />
        </Pressable>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS}
        keyExtractor={(item) => item.value}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => {
          const meta = item.value === 'all'
            ? { icon: 'layers' as const, tint: colors.ink, text: colors.white }
            : typeStyle(item.value);
          const selected = filter === item.value;
          return (
            <Chip
              label={item.label}
              selected={selected}
              tint={meta.tint}
              tintText={meta.text}
              icon={<Feather name={meta.icon} size={14} color={selected ? meta.text : colors.muted} />}
              height={40}
              onPress={() => onFilterChange(item.value)}
            />
          );
        }}
      />
    </>
  );
}
