import { Pressable, View, type ViewProps } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';

/** Dimmed backdrop + rounded bottom sheet. Used by routes presented as transparentModal. */
export function Sheet({ children, style, maxHeight = '92%' }: ViewProps & { maxHeight?: `${number}%` }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityLabel="Close"
        onPress={() => router.back()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,26,23,0.62)' }}
      />
      <View
        style={[
          { maxHeight, backgroundColor: colors.white, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 10, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) },
          style,
        ]}
      >
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.switchOff, marginBottom: 12 }} />
        {children}
      </View>
    </View>
  );
}
