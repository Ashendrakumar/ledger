# Ledger App — TODO (Pending Items)

> Compiled from `docs/KNOWLEDGE_BASE.md`, `docs/LOAN_EMI_PLAN.md`, and `README.md` (as of 2026-11-13).  
> Update this file as items are completed.

## High priority (verification / upgrade follow-ups)

- [x] **Real notifications wiring (Expo Notifications)** — replace `src/lib/notifications.ts` stub with real `expo-notifications` integration so local/EMI reminder APIs work; keep `expo-notifications` plugin configured in `app.json`. Validate reminder behavior on a development build/EAS build as required.
- [x] **Fix TabBar navigation crash/type issue** — `src/components/TabBar.tsx` now handles tab bar props defensively (no direct `navigation.emit` on undefined) and falls back to Expo Router navigation.
- [ ] **Run and pass lint** — `npm run lint` / `npx expo lint` (did not complete in prior environment run; re-run locally).
- [x] **Run and pass typecheck** — `npx tsc --noEmit` clean.
- [ ] **Node environment** — upgrade local Node to SDK 58-recommended `>=22.13.0` to avoid Expo/Metro/tooling engine warnings and CLI issues.

## README — not built yet

- [ ] **Backend-backed email sign-in** — replace local auth stub with real email-code backend flow.
- [ ] **Budget alerts & bill reminders (full product behavior)** — ensure notification-backed alerts/reminders are complete and reliable (permissions UX, scheduling, delivery on supported builds).
- [ ] **Import from CSV** — add CSV import (export exists).
- [ ] **Light/dark theme** — add theme switching/support.
- [ ] **Insights donut center respects “Hide amounts”** — donut center labels/amounts must honor the hide-amounts setting.

## Knowledge base — known/pre-existing engineering issues

- [ ] `src/components/AppLockGate.tsx` — fix `react-hooks/set-state-in-effect` (derive/subscribe instead of setting state directly in effect body).
- [ ] `src/components/charts/Donut.tsx` — fix `react-hooks/immutability` (avoid mutating accumulators during render; precompute offsets).

## Loan & EMI plan (`docs/LOAN_EMI_PLAN.md`)

### P0 — Correctness & model
- [ ] Add **EMI math/unit tests** (`src/lib/emi` cases): overpay, partial payments, zero-rate, single installment, rounding/final residual, etc. (plan §7/§8).
- [ ] Verify/close remaining P0 acceptance details against plan (types/migration/overview behavior parity).

### P1 — Screens & UX
- [ ] **Loan detail schedule**: virtualized schedule (`FlatList`) and row-tap edit-payment **sheet** per plan (currently in-screen list/preview + inline edit flow).
- [x] **New loan**: first-3-rows mini schedule preview in estimate (month, interest/principal split, EMI).
- [x] **Loans list**: completed/paid-off loans separated into a collapsible “Completed loans” section.
- [x] Key UI state/copy alignment updates applied (Home “EMI partially paid · ₹X left” state; Plan hero shows “EMI left to pay this month” with “of ₹Y due”). Further spec refinements may still be needed.

### P2 — Reminders (real notifications)
- [x] Replace notifications stub with real `expo-notifications` module wiring in app code.
- [ ] Add/verify `expo-notifications` config plugin options as needed (icon/color/channel/sounds) and rebuild native/dev client.
- [ ] Validate end-to-end on **development build / EAS build** (Expo Go limitations on Android push/notifications apply): permission prompt flow, due & pre-due scheduling, reschedule/cancel on payment/loan/settings changes, deep-link tap to loan detail.
- [ ] Ensure notification body omits amounts when **Hide amounts** is enabled (logic exists; verify with real notifications).
- [ ] Handle permission denied UX (inline hint) per plan.

### P3 — Advanced
- [x] Prepayment flow with interest/months-saved preview (basic implementation present).
- [ ] Foreclosure/early-closure summary sheet (months remaining, interest saved).
- [x] “Completed loans” section/polish on `/loans` (basic collapsible section implemented).
- [ ] Loans section in CSV export; richer projected payoff presentation in Insights.
- [ ] Autopay flag (informational only).

## Notes
- `ios/` and `android/` are not committed (CNG). After dependency/native-config changes, regenerate via prebuild/dev build/EAS as needed.
- Keep money in integer paise and render via `<Money>`; follow `docs/KNOWLEDGE_BASE.md` conventions.
