import { Alert, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { useAuth } from '@/store/auth';
import { useEntries } from '@/store/entries';
import { useSettings } from '@/store/settings';
import { shareCsv } from '@/lib/csv';
import { authenticate, canAuthenticate } from '@/components/AppLockGate';

function Row({ label, right, onPress, first }: { label: string; right?: React.ReactNode; onPress?: () => void; first?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress}
      style={{ minHeight: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}>
      <AppText variant="body">{label}</AppText>
      {right ?? (onPress ? <Feather name="chevron-right" size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 6 }}>
    <AppText variant="label" color={colors.muted} style={{ marginLeft: 4 }}>{title}</AppText>
    <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>
  </View>
);

export default function Settings() {
  const { user, signOut } = useAuth();
  const s = useSettings();
  const { entries, clearAll, loadSample } = useEntries();

  const exportCsv = async () => {
    try {
      if (!(await shareCsv(entries))) Alert.alert('Sharing is not available on this device.');
    } catch {
      Alert.alert('Could not export', 'Please try again.');
    }
  };
  const toggleLock = async (on: boolean) => {
    if (!on) return s.set('appLock', false);
    if (!(await canAuthenticate())) {
      Alert.alert('App lock needs a screen lock', 'Set up Face ID, a fingerprint or a passcode in your device settings first.');
      return;
    }
    if (await authenticate('Turn on app lock')) s.set('appLock', true);
  };
  const confirm = (title: string, ok: string, fn: () => void) =>
    Alert.alert(title, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: ok, style: 'destructive', onPress: fn }]);

  return (
    <Screen tabBar={false}>
      <ScreenHeader title="Settings" back />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.ink, borderRadius: 22, padding: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="user" size={26} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading" color={colors.white} numberOfLines={1} style={{ fontSize: 16 }}>{user?.name ?? user?.email.split('@')[0]}</AppText>
          <AppText variant="caption" color={colors.onInkMuted} numberOfLines={1}>{user?.email}</AppText>
        </View>
      </View>

      <Group title="PREFERENCES">
        <Row first label="Currency" right={<AppText color={colors.muted} variant="caption">₹ INR</AppText>} />
        <Row label="Hide amounts" right={<Toggle label="Hide amounts" value={s.hideAmounts} onValueChange={(v) => s.set('hideAmounts', v)} />} />
      </Group>

      <Group title="YOUR DATA">
        <Row first label="Export to CSV or Google Sheets" onPress={exportCsv} />
        <Row label="Load sample data" onPress={() => confirm('Replace your entries with sample data?', 'Replace', loadSample)} />
        <Row label="Delete all entries" onPress={() => confirm('Delete every entry?', 'Delete all', clearAll)} />
      </Group>

      <Group title="SECURITY AND ALERTS">
        <Row first label="App lock (Face ID or PIN)" right={<Toggle label="App lock" value={s.appLock} onValueChange={toggleLock} />} />
        <Row label="Budget alerts" right={<Toggle label="Budget alerts" value={s.budgetAlerts} onValueChange={(v) => s.set('budgetAlerts', v)} />} />
        <Row label="Bill reminders" right={<Toggle label="Bill reminders" value={s.billReminders} onValueChange={(v) => s.set('billReminders', v)} />} />
      </Group>

      <Button label="Sign out" variant="danger" onPress={signOut} />
    </Screen>
  );
}
