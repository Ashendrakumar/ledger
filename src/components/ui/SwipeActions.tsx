import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
}

/** Compact, consistent trailing actions for swipeable list rows. */
export function SwipeActions({ onEdit, onDelete, editLabel = 'Edit', deleteLabel = 'Delete' }: Props) {
  const buttonStyle = (pressed: boolean, backgroundColor: string) => ({
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: pressed ? 0.72 : 1,
    transform: [{ scale: pressed ? 0.94 : 1 }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={editLabel} onPress={onEdit} style={({ pressed }) => buttonStyle(pressed, colors.editActionTint)}>
        <Feather name="edit-2" size={17} color={colors.editAction} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={deleteLabel} onPress={onDelete} style={({ pressed }) => buttonStyle(pressed, colors.deleteActionTint)}>
        <Feather name="trash-2" size={17} color={colors.danger} />
      </Pressable>
    </View>
  );
}
