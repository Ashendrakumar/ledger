import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Entry } from '@/types';

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function entriesToCsv(entries: Entry[]): string {
  const head = ['kind', 'type', 'category', 'month', 'date', 'amount_inr', 'note'];
  const rows = entries.map((e) => [e.kind, e.type, e.category, e.month, e.date ?? '', (e.amountPaise / 100).toFixed(2), e.note ?? ''].map(esc).join(','));
  return [head.join(','), ...rows].join('\n');
}

/** Writes a CSV to the cache and opens the share sheet (Drive, Sheets, Files...). */
export async function shareCsv(entries: Entry[]): Promise<boolean> {
  const file = new File(Paths.cache, `ledger-${Date.now()}.csv`);
  file.create({ overwrite: true });
  file.write(entriesToCsv(entries));
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Ledger data' });
  return true;
}
