# Ledger App — TODO (Pending Items)

> Compiled from `docs/KNOWLEDGE_BASE.md`, `docs/LOAN_EMI_PLAN.md`, and `README.md` (as of 2026-11-13).  
> Update this file as items are completed.
>
> Status updates (2026-11-23+): lint passes, typecheck passes, Node upgraded via nvm (22.23.4).
> Completed: AppLockGate + Donut fixes, Insights donut hide-amounts, EMI unit tests (`src/lib/emi.test.ts`),
> CSV import/export (loans section included) + `addMany` store action, light/dark theme,
> expo-notifications config plugin options (icon/color/defaultChannel), EMI reminder content tests
> (`src/lib/reminders.test.ts`), permission-denied inline hint, autopay informational flag.
> Completed: budget alert implementation, virtualized loan schedule, payment editing,
> foreclosure summary, and P0 acceptance review. Remaining external validation: notification delivery
> on a dev/production build and deployment of the email verification backend endpoints.

## High priority (verification / upgrade follow-ups)

- [x] **First-login income and suggested plan setup** — onboarding collects monthly income, suggests editable budget lines, and saves the first month's planned entries before opening the app.

- [x] **Real notifications wiring (Expo Notifications)** — replace `src/lib/notifications.ts` stub with real `expo-notifications` integration so local/EMI reminder APIs work; keep `expo-notifications` plugin configured in `app.json`. Validate reminder behavior on a development build/EAS build as required.
- [x] **Fix TabBar navigation crash/type issue** — `src/components/TabBar.tsx` now handles tab bar props defensively (no direct `navigation.emit` on undefined) and falls back to Expo Router navigation.
- [x] **Run and pass lint** — `npm run lint` / `npx expo lint` — clean.
- [x] **Run and pass typecheck** — `npx tsc --noEmit` clean.
- [x] **Node environment** — nvm now runs node v22.23.4 (≥ SDK 58-recommended `>=22.13.0`).

## README — not built yet

- [x] **Backend-backed email sign-in** — client flow added: `sendVerifyCode`/`verifyEmailCode` in `useAuth`, `apiPost` helper (`src/lib/api.ts`, base URL from app.json `extra.apiBase`), login screen uses them end-to-end (send code → enter code → sign in). Backend endpoints to implement separately: `POST /api/auth/email/send`, `POST /api/auth/email/verify`.
- [x] **Budget alerts & bill reminders** — category spending alerts at 80% and 100% of planned amounts; opt-in permissions and denial guidance; EMI due/pre-due scheduling, resync, deep links, and hidden-amount support. Device delivery still needs a development/production build.
- [x] **Import from CSV** — added (`src/lib/csv.ts` parseCsv + `useEntries.addMany` + Settings "Import from CSV" row).
- [x] **Light/dark theme** — added theme switching (System default / Light / Dark) via `colors` proxy in `src/theme` + settings row.
- [x] **Insights donut center respects “Hide amounts”** — `Donut` masks center labels/amounts via `hideAmounts`.

## Knowledge base — known/pre-existing engineering issues

- [x] `src/components/AppLockGate.tsx` — fixed `react-hooks/set-state-in-effect` (derived state + render-phase reset).
- [x] `src/components/charts/Donut.tsx` — fixed `react-hooks/immutability` (offsets precomputed in reduce).

## Loan & EMI plan (`docs/LOAN_EMI_PLAN.md`)

### P0 — Correctness & model
- [x] Add **EMI math/unit tests** (`src/lib/emi.test.ts`): zero-rate, single installment, overpay clamp, partial, rounding/final residual, etc. (plan §7/§8) — run via `npx tsx --test src/lib/emi.test.ts`.
- [x] Verify/close remaining P0 acceptance details against plan — `npx tsc --noEmit` clean; `src/lib/emi.test.ts` covers the §7 math cases; §8 locale handled via `monthKey`/`shiftMonth`; `src/store/loans.ts` migration + `getLoanOverview` reviewed for parity.

### P1 — Screens & UX
- [x] **Loan detail schedule**: virtualized schedule (`SectionList`) with `Paid · n` / `Upcoming · n` section headers; row-tap opens the new `LoanPaymentSheet` (amount/date/kind + Save/Delete) instead of the old inline edit flow.
- [x] **New loan**: first-3-rows mini schedule preview in estimate (month, interest/principal split, EMI).
- [x] **Loans list**: completed/paid-off loans separated into a collapsible “Completed loans” section.
- [x] Key UI state/copy alignment updates applied (Home “EMI partially paid · ₹X left” state; Plan hero shows “EMI left to pay this month” with “of ₹Y due”). Further spec refinements may still be needed.

### P2 — Reminders (real notifications)
- [x] Replace notifications stub with real `expo-notifications` module wiring in app code.
- [x] Added `expo-notifications` config plugin options in `app.json` (icon/color/defaultChannel; needs native rebuild/EAS validation).
- [x] Reminder behavior implementation — permission prompt flow, due/pre-due scheduling, reschedule/cancel on payment/loan/settings changes, and deep-link tap to loan detail. Physical delivery remains build/device dependent.
- [x] Ensure notification body omits amounts when **Hide amounts** is enabled — `emiReminderContent` (`src/lib/reminderContent.ts`) + tests in `src/lib/reminders.test.ts`.
- [x] Handle permission denied UX (inline hint) per plan — Settings shows a hint when notifications are denied.

### P3 — Advanced
- [x] Prepayment flow with interest/months-saved preview (basic implementation present).
- [x] Foreclosure/early-closure summary sheet — `LoanForeclosureSheet` (`src/components/LoanForeclosureSheet.tsx`) with outstanding, months remaining, interest saved; opened from the loan detail screen.
- [x] “Completed loans” section/polish on `/loans` (basic collapsible section implemented).
- [x] Loans section in CSV export (`loansToCsv` in `src/lib/csv.ts`). Richer projected payoff presentation still open.
- [x] Autopay flag (informational only) — Settings toggle added.

## Notes
- `ios/` and `android/` are not committed (CNG). After dependency/native-config changes, regenerate via prebuild/dev build/EAS as needed.
- Keep money in integer paise and render via `<Money>`; follow `docs/KNOWLEDGE_BASE.md` conventions.
- Tests: `npx tsx --test src/lib/emi.test.ts src/lib/reminders.test.ts`.
