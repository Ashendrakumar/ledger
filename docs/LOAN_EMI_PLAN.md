# Loan & EMI — Complete Plan

**Status:** Proposed (for review) — nothing in this doc implements itself; each phase is a separate PR-sized change.
**Scope:** Data model & EMI math · reminder/overdue logic · Home & Plan integration · all loan screens & flows.
**Author context:** Current implementation as of 2026-11. Home/Plan/Loans already ship a basic version of most pieces (see §2).

---

## 1. Goals

1. Every EMI is either accounted for or flagged — nothing silently unpaid.
2. Outstanding balance, schedule and next-payment always agree (single source of truth: the schedule, derived from `Loan` + `LoanPayment[]`).
3. Proactive reminders: user sees "EMI due" before they miss it, not after.
4. Full visibility everywhere money is planned: Home, Plan, Insights.
5. Zero double-counting between EMI and planned expenses.

**Non-goals (this plan):** multi-currency, bank feed sync, refinance marketplace, autopay execution, tax certificates.

---

## 2. Current state (as shipped)

### 2.1 Data model (`src/types.ts`)
```ts
Loan        { id, name, principalPaise, annualRatePct, tenureMonths, startMonth /* YYYY-MM */, emiPaise /* derived */ }
LoanPayment { id, loanId, month /* YYYY-MM */, amountPaise, kind: 'actual' | 'planned', date?, note? }
```
- Persisted in AsyncStorage under `ledger.loans` (zustand `persist`, **version 1**).
- All money is integer **paise**. Schedule is **derived, never stored** (`buildSchedule` replays payments from `startMonth`).

### 2.2 EMI math (`src/lib/emi.ts`)
- `computeEMI` — reducing-balance formula `P·r·(1+r)^n / ((1+r)^n − 1)`, `r = annualRatePct / 12 / 100`. Zero-rate falls back to `P / n`. Rounded to paise.
- `buildSchedule` — walks `tenureMonths` rows; per row: `interest = round(balance · r)`, `principal = max(0, emi − interest)` (final row: `balance − interest`). Payments applied as `principalApplied = max(0, paidAmount − interest)`; rows flagged `paid` if any payment exists.
- Helpers: `outstandingBalance`, `repaidRatio`, `computeLoanTotals` (total interest / payable).
- Known drift: `emi × tenure − principal` ≠ sum of rounded per-row interest by a few paise; final installment clears the residual. Acceptable, but see §7.3.

### 2.3 Screens & integration points
| Surface | What exists today |
|---|---|
| `/loans` | List of loans + ink summary hero (outstanding / EMI per month / total borrowed), per-loan card with repaid progress bar. Empty state with CTA. |
| `/loan-new` | Bottom-sheet form: name (+ quick-pick chips), principal, rate, tenure chips, start month. Live EMI estimate card. Footer = 50/50 Close / Create loan. |
| `/loan/[id]` | Outstanding hero, facts card (principal, rate, tenure, EMI, total interest, total repaid), "Next payment" card with **Mark as paid** (records `kind: 'planned'`!) and **Save actual** (dated actual), "Undo payment", full amortization list. |
| Home | "Loans & EMI" peach card → `/loans`: percent icon, overdue count line (red) or "All EMIs paid", total outstanding + chevron. Bell → EMI-reminder alert when overdue > 0. |
| Plan | Ink hero line "EMI due this month"; collapsible **EMI / Loans** section listing per-loan status rows (Paid/Planned/EMI due/Overdue), links to loan detail. |
| Settings | `billReminders` toggle — **currently a no-op**. |
| Insights | Nothing loan-related. |

### 2.4 Overdue semantics (current)
An installment is **overdue** iff `row.paid === false && row.month < monthKey(new Date())` (real-world current month). Current-month installments are "due", never overdue — there is no due day. Both Home and Plan use this rule; there is no central helper (duplicated inline).

### 2.5 Known defects worth fixing en route
1. **`Mark as paid` records `kind: 'planned'`** — schedule treats any payment as paid, so the UI lies by example ("paid" vs "planned" conflated). Users expect it to mean an actual payment.
2. **No partial-payment concept** — a ₹100 payment marks the EMI month `paid`.
3. **No edit / delete** for loans, and no edit of past payments (only "Undo" on the next unpaid row).
4. **`balanceAfter` can go negative** when `paidAmount > emi` (overpay not clamped).
5. **Amortization list renders all rows** in a plain `ScrollView` map (up to 360 rows + children).
6. Overdue logic duplicated; no single `loanStatus()` helper.
7. `billReminders` setting does nothing.
8. Deleting a loan deletes its payments silently except through the same store action (fine), but there is **no UI** to delete a loan at all.

---

## 3. Data model & EMI math — decisions

### 3.1 Types (target)
```ts
export interface Loan {
  id: string; name: string;
  principalPaise: number; annualRatePct: number; tenureMonths: number;
  startMonth: string;             // YYYY-MM
  emiPaise: number;               // derived at creation; re-derived on edit
  dueDay?: number;                // 1..31, default 5 — NEW (v2 migration)
  prepayments?: never;            // prepay flow → see 3.4
}
export type PaymentKind = 'actual' | 'planned' | 'prepayment';   // prepayment: NEW
export interface LoanPayment {
  id: string; loanId: string; month: string;
  amountPaise: number; kind: PaymentKind; date?: string; note?: string;
}
```
`PaymentStatus` is **derived**, never stored: `'paid' | 'partial' | 'planned' | 'upcoming' | 'due' | 'overdue'`.

### 3.2 Persistence & migration
- `ledger.loans` → **version 2**. `migrate` fills `dueDay: 5` on existing loans, drops unknown/invalid fields, clamps `tenureMonths ∈ [1, 480]`, `annualRatePct ∈ [0, 100]`, `dueDay ∈ [1, 31]`.
- Whole-state revalidation on rehydrate: drop payments whose `loanId` no longer exists; coerce `amountPaise` ≥ 0; validate month formats. Corruption must never crash the app (currently it can).
- Entries/plans stay in `ledger.entries` — no coupling between EMI and planned expense entries (see §6.4).

### 3.3 Math rules (normative)
- Interest accrues on **reducing balance**, month-aligned to `startMonth`; `r = annualRatePct / 12 / 100`, `interest = round(balance · r)`.
- EMI constant within loan: `EMI = P·r(1+r)^n / ((1+r)^n − 1)`; zero-rate → `P / n`. Rounding: final installment takes the **residual** (`principal = balance − interest`); sum of EMIs may differ from `EMI × n` by ≤ a few rupees. UI always shows per-row rounded numbers; totals are computed from rows, never re-derived.
- **Payment application (per row):** `principalApplied = clamp(paidAmount − interest, 0, balanceBefore)`. **Overpay is clamped at balance** (fixes negative-balance defect).
- **Row status:**
  - `paid` — `paidAmount ≥ emi` (schedule treats as settled), or balance is 0.
  - `partial` — `0 < paidAmount < emi`. Partial payments reduce principal only; the shortfall is **not re-amortized** and does **not** push the schedule out; the row remains `partial` until the cumulative `partial`s cover `emi` or a later payment settles it (see 3.5 for policy).
  - `planned` — payment exists with `kind: 'planned'` and suffices to settle.
  - `upcoming` / `due` / `overdue` — see §4.
- `outstandingBalance` = last row `balanceAfter`. `repaidRatio` = `(P − outstanding) / P`, clamped `[0, 1]`. Early years show low progress — show **both** principal % and interest % so users aren't demoralized by the "interest-first" curve.

### 3.4 Prepayment (P3, design now so v2 fits)
- A lump sum is recorded as `kind: 'prepayment'` in month M.
- Effect: `principalApplied_M += prepayment` (after interest), balance drops immediately; EMI unchanged; remaining tenure shortens naturally when the residual hits 0.
- No re-amortization, no stored schedule — derived rules keep this trivial.
- UI: long-press / menu on loan detail → "Make prepayment" → amount entry sheet.

### 3.5 Shortfall policy (decision)
Cumulative partials toward one month's EMI are **not** auto-rolled into the next month; each month stands alone. Rationale: matches Indian bank practice for missed-EMI fees better than re-amortizing, keeps mental model "this EMI, this month". Document in-app help copy: "Short payments reduce principal; the EMI still shows as due/partial until the month's full EMI is covered."

### 3.6 Single derivation entry point
```ts
getLoanOverview(loan, payments, month /* for view */) → {
  schedule: LoanScheduleRow[], outstanding, repaid, ratio,
  statusFor(row): PaymentStatus, nextDue: Row | null,
  overdueCount(uptoMonth): number, emiDueThisMonth: number,
  remainingInterest: number,
}
```
Home, Plan, Insights, bell badge all call this — no duplicated logic. `overdueCount` counts rows with status `overdue|partial` before today.

---

## 4. Reminders & overdue logic

### 4.1 Status ladder (per row, evaluated live)
| Status | Condition |
|---|---|
| `paid` | settled (amount ≥ EMI) |
| `planned` | plan recorded, would settle |
| `partial` | `0 < paid < emi` |
| `upcoming` | current or future month & today < dueDay |
| `due` | selected month == current month & today ≥ dueDay & unpaid |
| `overdue` | `month < current month` & unpaid (or current month & today ≥ dueDay & unpaid) |

Default `dueDay = 5` (see migration). Selected-month views (Home/Plan) show due/upcoming for *that* month; alerts use **real today**, not the browsed month.

### 4.2 In-app signals
- Home bell badge: dot visible iff `overdueCount(today) > 0`. Tap → alert listing count + "View loans" → `/loans`. (Today: badge always visible — change to conditional.)
- Home Loans & EMI card: when nothing overdue, show `Next EMI ₹X · {dueDay} {Mon}`.
- Plan: section header total = EMI due in the *browsed* month; rows carry status chips (Paid/Planned/Partial/Due/Overdue/Upcoming), overdue rows in `colors.danger`.
- Insights: **Debt-service ratio** card — EMI ÷ income for the month, banded: `< 35%` healthy (savings color), `35–50%` strain (expense), `> 50%` risky (danger). Plus "interest paid this month" line.

### 4.3 Local notifications (P2)
- Library: `expo-notifications` (config plugin; **requires development build / EAS build — does not work in Expo Go on Android**).
- Wiring: `settings.billReminders === true` **and** notification permission granted → schedule per loan: due notice 3 days before `dueDay` 09:00, and on `dueDay` 09:00, copy `"{Loan} EMI {₹X} due today/in 3 days"`, `data: { deepLink: '/loan/[id]?id=…' }`.
- Reschedule triggers: payment recorded/undone, loan added/edited/deleted, `billReminders` toggled, dueDay changed. Implementation: `syncEmiReminders(loans, payments)` called from store subscriptions (debounced), stores notification IDs in `ledger.reminders` (own small persist slice).
- If permission denied / toggle off → badge logic §4.2 still works. If module unavailable → no-op with console warn; never crash.
- Tap notification → `router.push('/loan/[id]', { params: { id } })`.

### 4.4 Deletion & undo semantics
- "Undo payment" available on **any** schedule row (today: only next-unpaid). Edit payment opens amount/date/note.
- Delete loan → confirm dialog spells out "and its N recorded payments"; cascades payments; cancels its reminders.

---

## 5. Screens & UI flows (target)

### 5.1 `/loans` (list)
- Ink hero unchanged (outstanding / EMI / borrowed) + one new line: `Next due ₹X · {dueDay} {Mon}` or `N overdue` in danger.
- Rows sorted by outstanding desc; each row: name, outstanding (large), EMI/month, **repaid %** thin bar, next-due date or overdue chip. Tapping → detail.
- Header button: `New loan` (existing). Empty state: illustration + primary CTA + copy "Loans tracked offline, on this device".
- Deleted/paid-off loans: `Paid off` badge, `outstanding ≤ 0`, collapsed by default under "Completed" (P3 if time permits).

### 5.2 `/loan-new`
- Inputs: name (+ quick chips), principal (₹ input), rate (with % suffix + helper "p.a."), **tenure free numeric** + chips as quick picks, start month (YYYY-MM validated), **EMI due day** picker (chips 1/5/10/15/28 + free 1–31).
- Validation inline: red border + helper text (pattern exists); submit disabled until valid.
- Live preview: EMI, total interest, total payable (exists) + **first-3-rows** mini schedule; `principal = 0` guard.
- Footer: 50/50 Close | Create loan (exists). Full-width bottom sheet, grab handle (exists).

### 5.3 `/loan/[id]` (redesigned payment card)
- Header: outstanding + repaid progress (exists) + `Next: {EMI} · {dueDay} {Mon YYYY}` line.
- **Record payment card:** segmented `Actual | Planned`; amount field pre-filled with EMI (editable); `date` appears only for `Actual` (defaults today); one primary button `Record payment`; below, subtle link `Undo last payment` when one exists. This kills the misleading "Mark as paid = planned" path.
- Stats rows: principal, rate p.a., tenure, EMI, total interest **remaining** (today: only total interest), total repaid, paid % / interest % split bars.
- **Schedule list:** virtualized (`FlatList`), section header chips `Paid · {n}` / `Upcoming · {n}`; each row: status dot/icon (check/clock/warn), month, interest/principal split, row tap → edit-payment sheet (amount, date, kind, note, Save/Delete).
- Destructive zone: `Delete loan` (outline danger), confirm with counts (§4.4).
- Layout must work with `hideAmounts` (all amounts via `<Money>`).

### 5.4 `add` sheet — unchanged

### 5.5 Home — "Loans & EMI" card (delta from §2 Home)
States: (a) none → CTA card; (b) all paid & nothing due → `Next EMI ₹X · {dueDay} {Mon}`; (c) overdue → red count line + total outstanding (exists); (d) partially paid → amber "EMI partially paid · ₹Y left". Bell badge: conditional dot (§4.2).

### 5.6 Plan — EMI section (delta)
Status chips per row; partial state; section stays collapsible (exists); hero "EMI due this month" (exists) now **excludes** paid/planned rows: shows "₹X left to pay of ₹Y due". "Left to allocate" unchanged; caption clarifies EMI is excluded from both planned expense and the allocatable pool (EMI ≠ planned expense; see §6.4).

### 5.7 Insights — new card
"Debt service" card: EMI ÷ income ratio bar (banded, §4.2), "Interest paid this month ₹X", "Projected payoff {Mon YYYY}" (max last row month across loans). Fits between savings rate and expense breakdown.

### 5.8 Settings
- `Bill reminders` finally works (§4.3). Copy under toggle: "We'll notify you before each EMI is due."
- Keep `budgetAlerts` as-is (out of scope).

---

## 6. Integration notes & policies

### 6.1 `hideAmounts`
Every loan/EMI amount renders through `<Money>` — including notifications (skip amounts when hidden? notifications can't react; leave amounts out of notification body when `hideAmounts`).

### 6.2 `ledger.loans` v2
See §3.2. No changes to `ledger.entries`.

### 6.3 Reminder sync
`syncEmiReminders()` lives in `src/lib/reminders.ts`; called from `useLoans` actions (add/remove/markPayment/removePayment) and `useSettings.set('billReminders')`. Debounced 300 ms. IDs tracked in `ledger.reminders` v1.

### 6.4 EMI is not a planned expense
Do **not** inject EMI into `planned` entries (double counting; user data migration nightmares). Plan shows EMI separately and "Left to allocate" is computed from planned entries only, with a one-line explainer under the hero: "EMI of ₹X / mo is tracked separately from your plan."

### 6.5 Derived-selectors only
All screens consume `getLoanOverview()` — no screen-local schedule walks. Delete `outstandingBalance`/`repaidRatio` exported wrappers once call sites migrate.

### 6.6 Accessibility
Roles/labels on every new pressable; status chips are text + icon (never color-only); contrast of chip text ≥ 4.5:1 on tints; schedule list rows are buttons opening edit sheet.

---

## 7. Math correctness checklist

1. Zero-interest loan: EMI = P/n; schedule all `interest = 0`; ratio 0 → 100%.
2. Single-payment loan (`n = 1`): EMI = P + interest; final row = P.
3. Overpay month: balanceAfter = 0; later rows skipped (schedule marked `paid`/`closed`; list shows "Loan closed in {Mon}").
4. Partial every month: balance declines slower; EMI constant; total interest > normal — UI shows partial state; OK.
5. Payment recorded for month before `startMonth`: allowed but flagged `early/late` in note? Reject at input with helper text (payment month must lie within tenure).
6. `markPayment` with `amount ≤ 0`: rejected.
7. Rounding: `sum(interest rows)` vs `computeLoanTotals` — assert in a dev test (§8).
8. Locale: months are "YYYY-MM" keys; all display via `labelMonth`/`fullMonth`; never `Date` parsing of ambiguous strings.

---

## 8. Implementation phases

### Phase P0 — Correctness & model (foundation)
- [ ] Types: `dueDay?`, `PaymentKind` gains `'prepayment'`; `docs` updated.
- [ ] `ledger.loans` → v2 + migration + rehydrate validation.
- [ ] `computeEMI` unchanged; `buildSchedule` rewritten: clamp principalApplied to balance; `status` field; early-closed detection (balance 0 ⇒ later rows `paid/skipped`); overpay clamp.
- [ ] `getLoanOverview()` single selector; migrate all call sites (loans list, detail, home, plan); delete duplicated overdue code.
- [ ] Row status computation incl. partial; unit tests in `src/lib/emi.test.ts`-style (run via `npx tsx` or node assert): cases from §7 incl. overpay, partial, zero-rate, n=1.

### Phase P1 — Screens & UX
- [ ] `/loan-new`: dueDay picker, free tenure, first-3-rows preview, validation copy.
- [ ] `/loan/[id]`: Record-payment card (segmented + date), stats incl. remaining interest, virtualized schedule, row tap → edit-payment sheet (amount/date/note/kind + delete), delete-loan flow.
- [ ] `/loans`: next-due line in hero, rows with repaid bar + status chip, completed collapse.
- [ ] Home card: 4 states §5.5 + conditional bell dot.
- [ ] Plan: status chips, partial support, hero copy split ("left to pay of due").
- [ ] Insights: Debt-service card.
- [ ] Settings: wire `billReminders` (toggle works, copy, no-op safe).
- [ ] Empty/error/corruption states everywhere; a11y pass.

### Phase P2 — Reminders
- [ ] Add `expo-notifications` + config plugin; run `npx expo install expo-notifications`.
- [ ] `src/lib/reminders.ts` sync engine + `ledger.reminders` slice; hooks in loans/settings stores (debounced).
- [ ] Due/then-overdue pair per loan per month; cancel on settle; deep-link tap.
- [ ] Permission prompt UX (ask on first `billReminders` enable, not at launch); denial → inline hint.
- [ ] Hide amounts in notification body when `hideAmounts`.

### Phase P3 — Advanced (post-P2)
- [ ] Prepayment flow (records `prepayment` kind; reduces tenure; shows "months saved").
- [ ] Foreclosure/early-closure summary sheet: months remaining, interest saved.
- [ ] Edit loan (rate, dueDay, name) — recomputes EMI + future rows; past rows untouched.
- [ ] Loans section in CSV export; "Projected payoff" chip on Insights; "Completed loans" on /loans.
- [ ] Autopay flag (informational only — no payment execution).

### Explicitly out of scope
Bank sync, credit-score, amortization renegotiation wizard, reminders via SMS/WhatsApp, iOS-only widgets.

---

## 9. Acceptance criteria

1. Fresh install → add home loan (₹12,00,000 @ 8.75%, 180 mo, start 2026-11, dueDay 5): EMI ≈ ₹11,974; outstanding == principal; Plan shows ₹11,974 due; bell quiet.
2. Record ₹11,974 actual for 2026-11 → row paid; Plan/Home show ₹0 left to pay; badge logic correct; notification (P2) cancelled.
3. Pay ₹6,000 partial → row `partial`; outstanding reduced by principal portion only; Plan shows ₹5,974 due of ₹11,974.
4. Browse to Dec 2026 with Nov unpaid → Nov row `overdue` (danger) everywhere; bell dot appears; alert deep-links to loan detail.
5. Edit Nov payment → schedule reflows; totals (interest/outstanding) recompute consistently.
6. Delete loan → payments gone; reminders cancelled; Home/Plan/Insights total 0-safe.
7. Overpay any month → balance 0, later rows shown as skipped/closed; no negative values anywhere.
8. `hideAmounts` → all amounts masked in all four surfaces + notifications body.
9. Corrupt `ledger.loans` (hand-edited) → app boots; invalid rows dropped; no crash.
10. Reopen app after migration → v1 loans gain `dueDay: 5`; history intact.

---

## 10. Risks & notes

- **expo-notifications in Expo Go (Android)**: unsupported → P2 needs a dev/EAS build. Plan must not block P0–P1 on it.
- **Rounding drift** accepted: final installment absorbs residual; never recompute EMI from totals.
- **Double-count anxiety**: keep EMI out of `planned` entries; explain in-app (§6.4).
- **Time zones**: month keys are local-calendar `YYYY-MM`; tests pin `now` explicitly.
- **Large tenures** (360 rows): FlatList mandatory; schedule list first paint < 100 ms on mid-range Android.
- **`Reem` scope creep**: prepayment & foreclosure are P3 — resist merging into P1.
