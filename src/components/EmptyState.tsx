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
  variant?: 'goal' | 'loan' | 'actual' | 'planned';
  hint?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
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

function FinanceEmptyIllustration({ variant }: { variant: 'goal' | 'loan' | 'actual' | 'planned' }) {
  return (
    <Svg width={190} height={150} viewBox="0 0 190 150" accessibilityLabel={{ goal: 'Savings goal illustration', loan: 'Loan illustration', actual: 'Transaction illustration', planned: 'Calendar illustration' }[variant]}>
      <Circle cx="95" cy="72" r="43" fill={colors.incomeTint} />
      <Circle cx="51" cy="45" r="3" fill={colors.mint} />
      <Circle cx="139" cy="43" r="2.5" fill={colors.savings} opacity={0.55} />
      <Circle cx="143" cy="91" r="4" fill={colors.mint} opacity={0.5} />
      <Path d="M52 116 Q95 106 138 116 Q95 126 52 116Z" fill={colors.border} opacity={0.75} />
      {variant === 'goal' ? (
        <>
          <Circle cx="93" cy="71" r="28" fill={colors.card} stroke={colors.textSoft} strokeWidth="2" />
          <Circle cx="93" cy="71" r="21" fill="none" stroke={colors.income} strokeWidth="5" />
          <Circle cx="93" cy="71" r="8" fill={colors.ink} />
          <Path d="M94 69 119 45M113 46l7-3-2 8" stroke={colors.expense} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : variant === 'loan' ? (
        <>
          <Rect x="65" y="49" width="58" height="48" rx="8" fill={colors.card} stroke={colors.textSoft} strokeWidth="2" />
          <Path d="M75 61h35M75 69h21M75 77h14" stroke={colors.borderStrong} strokeWidth="3" strokeLinecap="round" />
          <Circle cx="108" cy="72" r="14" fill={colors.ink} />
          <Path d="m101 77 5-6 4 3 6-7M112 67h4v4" stroke={colors.mint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : variant === 'actual' ? (
        <>
          <Rect x="70" y="42" width="48" height="61" rx="8" fill={colors.card} stroke={colors.ink} strokeWidth="2" />
          <Path d="M80 54h27M80 63h23M80 72h18" stroke={colors.borderStrong} strokeWidth="3.5" strokeLinecap="round" />
          <Rect x="80" y="82" width="14" height="5" rx="2.5" fill={colors.mint} />
        </>
      ) : (
        <>
          <Rect x="63" y="42" width="64" height="56" rx="9" fill={colors.card} stroke={colors.ink} strokeWidth="2" />
          <Path d="M63 53h64" stroke={colors.ink} strokeWidth="9" />
          <Path d="M77 39v9M112 39v9" stroke={colors.mint} strokeWidth="4" strokeLinecap="round" />
          <Rect x="73" y="62" width="9" height="8" rx="2" fill={colors.borderStrong} />
          <Rect x="90" y="62" width="9" height="8" rx="2" fill={colors.borderStrong} />
          <Rect x="107" y="62" width="9" height="8" rx="2" fill={colors.borderStrong} />
          <Rect x="73" y="78" width="9" height="8" rx="2" fill={colors.borderStrong} />
          <Rect x="90" y="78" width="9" height="8" rx="2" fill={colors.borderStrong} />
        </>
      )}
      <Circle cx="119" cy="91" r="11" fill={colors.card} stroke={colors.mint} strokeWidth="1.5" />
      <Path d="M116 87h6M116 90h6M117 90l4 4M120 85c-3 0-4 2-4 5" stroke={colors.ink} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function EmptyState({ title, description, actionLabel, onAction, compact = false, variant, hint, secondaryLabel, onSecondary }: Props) {
  if (variant) {
    return (
      <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 22 }}>
        <FinanceEmptyIllustration variant={variant} />
        <View style={{ alignItems: 'center', gap: 5, maxWidth: 290 }}>
          <AppText variant="subheading" style={{ fontSize: 17, textAlign: 'center' }}>{title}</AppText>
          <AppText variant="caption" color={colors.muted} style={{ lineHeight: 18, textAlign: 'center', fontSize: 12 }}>{description}</AppText>
        </View>
        <Button label={actionLabel} icon={<Feather name="plus-circle" size={16} color={colors.mint} />} onPress={onAction} height={44} style={{ width: 172 }} />
        {secondaryLabel && onSecondary ? <Button label={secondaryLabel} variant="ghost" onPress={onSecondary} height={40} style={{ width: 190 }} /> : null}
        {hint ? <AppText variant="caption" color={colors.muted} style={{ fontSize: 10, textAlign: 'center' }}>{hint}</AppText> : null}
      </View>
    );
  }
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
