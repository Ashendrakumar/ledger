/** Paise are integers. 1 rupee = 100 paise. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);

/** Indian digit grouping: 1,84,300 */
export function formatINR(paise: number, opts: { sign?: boolean } = {}): string {
  const neg = paise < 0;
  const rupees = Math.round(Math.abs(paise) / 100);
  const s = String(rupees);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  const sign = neg ? '−' : opts.sign && paise > 0 ? '+' : '';
  return `${sign}₹${grouped}`;
}
