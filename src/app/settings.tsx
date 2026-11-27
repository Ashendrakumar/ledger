import { Alert, Platform, Pressable, View } from 'react-native';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import * as FS from 'expo-file-system';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors } from '@/theme';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonthMenu } from '@/components/MonthMenu';
import { Toggle } from '@/components/ui/Toggle';
import { useAuth } from '@/store/auth';
import { router } from 'expo-router';
import { useEntries } from '@/store/entries';
import { useLoans } from '@/store/loans';
import { useSettings } from '@/store/settings';
import { useGoals } from '@/store/goals';
import { clearAccountDataCache, deleteAccountData, exportAccountData, stopDataSync } from '@/lib/dataSync';
import { shareCsv, parseCsv } from '@/lib/csv';
import { authenticate, canAuthenticate } from '@/components/AppLockGate';
import { requestEmiReminderPermission } from '@/lib/reminders';
import { requestBudgetAlertPermission } from '@/lib/budgetAlerts';
import { useUi } from '@/store/ui';
import { fullMonth, shiftMonth } from '@/lib/dates';
import { inMonth } from '@/lib/selectors';
import { useToast } from '@/components/ui/Toast';

function Row({ label, right, onPress, first, icon, iconColor }: { label: string; right?: React.ReactNode; onPress?: () => void; first?: boolean; icon?: React.ComponentProps<typeof Feather>['name']; iconColor?: string }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress}
      style={{ minHeight: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon ? <Feather name={icon} size={18} color={iconColor ?? colors.muted} /> : null}
        <AppText variant="body">{label}</AppText>
      </View>
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
  const { showError } = useToast();
  const s = useSettings();
  const { entries, clearAll, loadSample, addMany, copyPlanFromPrevious } = useEntries();
  const loans = useLoans((x) => x.loans);
  const loanPayments = useLoans((x) => x.payments);
  const { month, setMonth } = useUi();
  const mode = s.theme ?? 'auto';
  const [monthMenu, setMonthMenu] = useState(false);
  const [remindersDenied, setRemindersDenied] = useState(false);
  const [budgetAlertsDenied, setBudgetAlertsDenied] = useState(false);

  const exportCsv = async () => {
    try {
      if (!(await shareCsv(entries, loans, loanPayments))) showError('Sharing is not available on this device.');
    } catch {
      showError('Could not export. Please try again.');
    }
  };
  const exportAccountJson = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Unavailable on web', 'Download the account JSON backup from an iOS or Android device.');
        return;
      }
      if (!user?.id) throw new Error('Sign in again to export your account data.');
      const data = await exportAccountData(user.id);
      const file = new File(Paths.cache, `ledger-account-${Date.now()}.json`);
      file.create({ overwrite: true });
      await file.write(JSON.stringify(data, null, 2));
      if (!(await Sharing.isAvailableAsync())) {
        showError('Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Ledger account data' });
    } catch (error) {
      showError(`Could not export account data. ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };
  const importCsv = async () => {
    try {
      const result = await FS.File.pickFileAsync({ mimeTypes: ['text/csv'], multipleFiles: false });
      if (result.canceled) return;
      const imported = parseCsv(await result.result.text());
      if (!imported.length) {
        showError('No entries found in the CSV file.');
        return;
      }
      addMany(imported);
      Alert.alert('Imported', `${imported.length} entries added to the ledger.`);
    } catch {
      showError('Could not import. Please try again.');
    }
  };
  const copyPreviousPlan = () => {
    const previousMonth = shiftMonth(month, -1);
    if (inMonth(entries, month, 'planned').length > 0) {
      Alert.alert('Add last month\'s plan?', `${fullMonth(previousMonth)} planned entries will be added to ${fullMonth(month)}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy', onPress: () => copyPlanFromPrevious(month) },
      ]);
    } else {
      copyPlanFromPrevious(month);
    }
  };
  const toggleLock = async (on: boolean) => {
    if (!on) return s.set('appLock', false);
    if (!(await canAuthenticate())) {
      showError('Set up Face ID, a fingerprint, or a passcode in your device settings first.');
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
      showError('Enable notifications for Ledger to receive EMI reminders.');
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
    if (!granted) showError('Enable notifications for Ledger to receive budget alerts.');
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
  const deleteAccount = () => Alert.alert(
    'Delete your account?',
    'This permanently deletes your account and its synced financial records. The action cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: () => {
        void (async () => {
          stopDataSync();
          if (!user?.id) throw new Error('Sign in again to delete your account.');
          await deleteAccountData(user.id);
          if (user?.id) await clearAccountDataCache(user.id);
          useEntries.getState().clearAll();
          useGoals.setState({ goals: [] });
          useLoans.setState({ loans: [], payments: [] });
          await signOut();
          router.replace('/(auth)');
          Alert.alert('Account deleted', 'Your account and synced financial records were deleted.');
        })().catch((error: unknown) => {
          const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
          showError(code.includes('requires-recent-login')
            ? 'For account security, sign out and sign back in, then retry account deletion.'
            : `Could not delete account. ${error instanceof Error ? error.message : 'Please try again.'}`);
        });
      } },
    ],
  );

  return (
    <Screen tabBar={false} header={<ScreenHeader title="Settings" back />}>
      <MonthMenu visible={monthMenu} month={month} onChange={setMonth} onClose={() => setMonthMenu(false)} />

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
        <Row label="Current month" onPress={() => setMonthMenu(true)} right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText color={colors.muted} variant="caption">{fullMonth(month)}</AppText>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </View>
        } />
        <Row label="Hide amounts" right={<Toggle label="Hide amounts" value={s.hideAmounts} onValueChange={(v) => s.set('hideAmounts', v)} />} />
        <Row
          label="Theme"
          icon={mode === 'dark' ? 'moon' : mode === 'light' ? 'sun' : 'smartphone'}
          iconColor={mode === 'dark' ? colors.mint : mode === 'light' ? colors.primary : colors.muted}
          right={<AppText color={colors.muted} variant="caption">{mode === 'auto' ? 'System' : mode}</AppText>}
          onPress={openTheme}
        />
      </Group>

      <Group title="PLANNING">
        <Row first label="Goals" onPress={() => router.push('/goals')} />
        <Row label={`Copy plan from ${fullMonth(shiftMonth(month, -1))}`} onPress={copyPreviousPlan} />
      </Group>

      <Group title="YOUR DATA">
        <Row first label="Export to CSV or Google Sheets" onPress={exportCsv} />
        <Row label="Export account backup (JSON)" onPress={() => { void exportAccountJson(); }} />
        <Row label="Import from CSV" onPress={importCsv} />
        <Row label="Load sample data" onPress={() => confirm('Replace your entries with sample data?', 'Replace', loadSample)} />
        <Row label="Delete all entries" onPress={() => confirm('Delete every entry?', 'Delete all', clearAll)} />
        <Row label="Delete account and synced data" onPress={deleteAccount} />
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
