import { View } from 'react-native';
import { router } from 'expo-router';
import { Button } from './Button';

interface Props {
  /** Label of the right (primary) action, e.g. "Save" / "Create loan" / "Done". */
  primaryLabel: string;
  onPrimary: () => void;
  disabled?: boolean;
  closeLabel?: string;
}

/** 50/50 footer for modal sheets: outlined Close on the left, solid primary action on the right. */
export function SheetActions({ primaryLabel, onPrimary, disabled, closeLabel = 'Close' }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Button variant="outline" label={closeLabel} onPress={() => router.back()} style={{ flex: 1 }} height={52} />
      <Button label={primaryLabel} onPress={onPrimary} disabled={disabled} style={{ flex: 1 }} height={52} />
    </View>
  );
}
