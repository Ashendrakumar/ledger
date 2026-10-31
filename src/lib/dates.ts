const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const todayISO = () => {
  const d = new Date();
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;
};

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}
export const shortMonth = (key: string) => MONTHS[Number(key.split('-')[1]) - 1];
export const labelMonth = (key: string) => `${shortMonth(key)} ${key.split('-')[0]}`;
export const fullMonth = (key: string) => `${FULL[Number(key.split('-')[1]) - 1]} ${key.split('-')[0]}`;

export function relativeDay(iso: string, today = todayISO()): string {
  if (iso === today) return 'Today';
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (iso === `${monthKey(y)}-${String(y.getDate()).padStart(2, '0')}`) return 'Yesterday';
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
