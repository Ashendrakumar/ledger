import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Entry, Loan, LoanPayment } from '@/types';
import { getLoanOverview, DEFAULT_DUE_DAY } from './emi';

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function entriesToCsv(entries: Entry[], loans: Loan[] = [], payments: LoanPayment[] = []): string {
  const head = ['kind', 'type', 'category', 'month', 'date', 'amount_inr', 'note'];
  const rows = entries.map((e) => [e.kind, e.type, e.category, e.month, e.date ?? '', (e.amountPaise / 100).toFixed(2), e.note ?? ''].map(esc).join(','));
  const loansCsv = loansToCsv(loans, payments);
  return loansCsv ? [head.join(','), ...rows, '', loansCsv].join('\n') : [head.join(','), ...rows].join('\n');
}

const LOAN_HEAD = ['loan_name', 'principal_paise', 'annual_rate_pct', 'tenure_months', 'start_month', 'due_day', 'status', 'outstanding_paise'];

/** Loans section for CSV export: name, principal, rate, tenure, start month, due day, status, outstanding. */
export function loansToCsv(loans: Loan[], payments: LoanPayment[]): string {
  if (!loans.length) return '';
  const rows = loans.map((l) => {
    const ov = getLoanOverview(l, payments);
    return [l.name, l.principalPaise, l.annualRatePct, l.tenureMonths, l.startMonth, l.dueDay ?? DEFAULT_DUE_DAY, ov.closedIn ? 'paid' : 'active', ov.outstanding]
      .map((v) => esc(String(v))).join(',');
  });
  return [LOAN_HEAD.join(','), ...rows].join('\n');
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Parses CSV text into entries (tolerates a leading header row and quoted fields). */
export function parseCsv(text: string): Omit<Entry, 'id'>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\r') { /* part of a CRLF line ending — the newline case below handles it */ }
    else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else field += c;
  }
  if (cur.length || field !== '') { cur.push(field); rows.push(cur); }

  const header = rows[0] ?? [];
  const isHeader = header.some((h) => /kind|category|type|amount/i.test(h));
  const out: Omit<Entry, 'id'>[] = [];
  for (const fields of isHeader ? rows.slice(1) : rows) {
    const kindStr = fields[0]?.trim();
    const typeStr = fields[1]?.trim();
    const category = fields[2]?.trim();
    const month = fields[3]?.trim();
    const date = fields[4]?.trim();
    const amountStr = fields[5]?.trim();
    const note = fields[6]?.trim();
    if (!category && !month && !amountStr) continue;
    if (month && !MONTH_RE.test(month)) continue;
    const amountPaise = Math.round(Number(amountStr) * 100);
    if (!Number.isFinite(amountPaise)) continue;
    out.push({
      kind: kindStr === 'planned' ? 'planned' : 'actual',
      type: typeStr === 'income' || typeStr === 'saving' ? typeStr : 'expense',
      category,
      month,
      ...(date ? { date } : {}),
      amountPaise,
      ...(note ? { note } : {}),
    });
  }
  return out;
}

/** Writes a CSV to the cache and opens the share sheet (Drive, Sheets, Files...). */
export async function shareCsv(entries: Entry[], loans: Loan[] = [], payments: LoanPayment[] = []): Promise<boolean> {
  const file = new File(Paths.cache, `ledger-${Date.now()}.csv`);
  file.create({ overwrite: true });
  file.write(entriesToCsv(entries, loans));
  if (loans.length) file.write(loansToCsv(loans, payments));
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Ledger data' });
  return true;
}
