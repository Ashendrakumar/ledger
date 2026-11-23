import { Alert, Pressable, View } from 'react-native';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import * as FS from 'expo-file-system';
import { colors } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { useAuth } from '@/store/auth';
import { router } from 'expo-router';
import { useEntries } from '@/store/entries';
import { useLoans } from '@/store/loans';
import { useSettings } from '@/store/settings';
import { shareCsv, parseCsv } from '@/lib/csv';
import { authenticate, canAuthenticate } from '@/components/AppLockGate';
import { requestEmiReminderPermission } from '@/lib/reminders';
import { requestBudgetAlertPermission } from '@/lib/budgetAlerts';

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
  const { entries, clearAll, loadSample, addMany } = useEntries();
  const loans = useLoans((x) => x.loans);
  const loanPayments = useLoans((x) => x.payments);
  const mode = s.theme ?? 'auto';
  const [remindersDenied, setRemindersDenied] = useState(false);
  const [budgetAlertsDenied, setBudgetAlertsDenied] = useState(false);

  const exportCsv = async () => {
    try {
      if (!(await shareCsv(entries, loans, loanPayments))) Alert.alert('Sharing is not available on this device.');
    } catch {
      Alert.alert('Could not export', 'Please try again.');
    }
  };
  const importCsv = async () => {
    try {
      const result = await FS.File.pickFileAsync({ mimeTypes: ['text/csv'], multipleFiles: false });
      if (result.canceled) return;
      const imported = parseCsv(await result.result.text());
      if (!imported.length) {
        Alert.alert('No entries found in the CSV file.');
        return;
      }
      addMany(imported);
      Alert.alert('Imported', `${imported.length} entries added to the ledger.`);
    } catch {
      Alert.alert('Could not import', 'Please try again.');
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
  const toggleReminders = async (on: boolean) => {
    if (!on) {
      setRemindersDenied(false);
      return s.set('billReminders', false);
    }
    const granted = await requestEmiReminderPermission();
    s.set('billReminders', true);
    setRemindersDenied(!granted);
    if (!granted) {
      Alert.alert('Notifications disabled', 'EMI reminders need notification access. Enable it for Ledger in system settings to get due-date alerts.');
    }
  };
  const toggleBudgetAlerts = async (on: boolean) => {
    if (!on) {
      setBudgetAlertsDenied(false);
      return s.set('budgetAlerts', false);
    }
    const granted = await requestBudgetAlertPermission();
    s.set('budgetAlerts', true);
    setBudgetAlertsDenied(!granted);
    if (!granted) Alert.alert('Notifications disabled', 'Budget alerts need notification access. Enable it for Ledger in system settings to get spending updates.');
  };
  const openTheme = () =>
    Alert.alert('Theme', `Current: ${mode === 'auto' ? 'System default' : mode}`, [
      { text: 'System default', onPress: () => s.set('theme', 'auto') },
      { text: 'Light', onPress: () => s.set('theme', 'light') },
      { text: 'Dark', onPress: () => s.set('theme', 'dark') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const confirm = (title: string, ok: string, fn: () => void) =>
    Alert.alert(title, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: ok, style: 'destructive', onPress: fn }]);

  return (
    <Screen tabBar={false} header={<ScreenHeader title="Settings" back />}>

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
        <Row label="Theme" right={<AppText color={colors.muted} variant="caption">{mode === 'auto' ? 'System' : mode}</AppText>} onPress={openTheme} />
      </Group>

      <Group title="PLANNING">
        <Row first label="Goals" onPress={() => router.push('/goals')} />
      </Group>

      <Group title="YOUR DATA">
        <Row first label="Export to CSV or Google Sheets" onPress={exportCsv} />
        <Row label="Import from CSV" onPress={importCsv} />
        <Row label="Load sample data" onPress={() => confirm('Replace your entries with sample data?', 'Replace', loadSample)} />
        <Row label="Delete all entries" onPress={() => confirm('Delete every entry?', 'Delete all', clearAll)} />
      </Group>

      <Group title="SECURITY AND ALERTS">
        <Row first label="App lock (Face ID or PIN)" right={<Toggle label="App lock" value={s.appLock} onValueChange={toggleLock} />} />
        <Row label="Budget alerts" right={<Toggle label="Budget alerts" value={s.budgetAlerts} onValueChange={(v) => { toggleBudgetAlerts(v).catch(() => {}); }} />} />
        {budgetAlertsDenied ? <Row label="Allow Ledger notifications in system settings to get budget alerts." /> : null}
        <Row label="Bill reminders" right={<Toggle label="Bill reminders" value={s.billReminders} onValueChange={(v) => { toggleReminders(v).catch(() => {}); }} />} />
        {remindersDenied ? <Row label="Allow Ledger notifications in system settings to get due-date alerts." /> : null}
        <Row label="Autopay (informational)" right={<Toggle label="Autopay" value={s.autopay} onValueChange={(v) => s.set('autopay', v)} />} />
      </Group>

      <Button label="Sign out" variant="danger" onPress={signOut} />
    </Screen>
  );
}
