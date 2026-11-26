import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/AppText';

interface Props {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
}

function EmptyStateIllustration({ compact }: { compact: boolean }) {
  return (
    <Svg width={compact ? 144 : 180} height={compact ? 108 : 136} viewBox="0 0 180 136">
      <Circle cx="90" cy="68" r="62" fill={colors.incomeTint} />
      <Circle cx="36" cy="39" r="6" fill={colors.savingsTint} />
      <Circle cx="146" cy="42" r="4" fill={colors.expenseTint} />
      <Rect x="52" y="17" width="70" height="92" rx="13" fill={colors.card} stroke={colors.border} strokeWidth="2" />
      <Rect x="66" y="33" width="38" height="6" rx="3" fill={colors.primary} />
      <Rect x="66" y="48" width="42" height="5" rx="2.5" fill={colors.borderStrong} />
      <Rect x="66" y="60" width="31" height="5" rx="2.5" fill={colors.borderStrong} />
      <Rect x="66" y="73" width="39" height="5" rx="2.5" fill={colors.borderStrong} />
      <Circle cx="119" cy="91" r="22" fill={colors.primary} stroke={colors.card} strokeWidth="4" />
      <Path d="M119 82v18M110 91h18" stroke={colors.white} strokeWidth="3" strokeLinecap="round" />
      <Circle cx="47" cy="99" r="5" fill={colors.savings} />
    </Svg>
  );
}

export function EmptyState({ title, description, actionLabel, onAction, compact = false }: Props) {
  return (
    <View style={{ alignItems: 'center', gap: compact ? 8 : 12, paddingHorizontal: 20, paddingVertical: compact ? 16 : 24, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border }}>
      <EmptyStateIllustration compact={compact} />
      <View style={{ alignItems: 'center', gap: 5 }}>
        <AppText variant="subheading" style={{ fontSize: 17, textAlign: 'center' }}>{title}</AppText>
        <AppText variant="caption" color={colors.muted} style={{ lineHeight: 19, textAlign: 'center' }}>{description}</AppText>
      </View>
      <Button
        label={actionLabel}
        icon={<Feather name="plus" size={17} color={colors.mint} />}
        onPress={onAction}
        height={44}
        style={{ alignSelf: 'stretch' }}
      />
    </View>
  );
}
