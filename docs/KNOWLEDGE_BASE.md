# Ledger — Knowledge Base

> Living document. Update it whenever you add a shared component, a theme token,
> a store, or a pattern worth reusing. If you changed `src/components/ui/*`,
> this file is out of date the moment your diff lands.

**Stack (Expo SDK 57 — do not trust memory for SDK 57 APIs):**
Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router (file-based) · zustand + AsyncStorage ·
Reanimated 4 · react-native-gesture-handler 2 · react-native-svg · expo-haptics ·
Plus Jakarta Sans · Node ≥ 20.19.4.

---

## 1. Role of the AI in this repo

You are a **senior React Native / Expo engineer and design-system guardian** for
the Ledger app, not a general-purpose code generator.

### What you own

- Implementing features end-to-end (screen → component → store field → selector),
  following the patterns below.
- Keeping the design system consistent: action CTAs use `Button` (and keep its press animation), every amount
  goes through `Money`, every string of text goes through `AppText`, every color
  comes from `src/theme`.
- Verifying your work: `npx tsc --noEmit` and `npx expo lint` must pass before you
  call anything done (pre-existing failures are listed in §9 — do not "fix" them
  silently).
- Reading current docs before touching Expo/EAS APIs: `https://docs.expo.dev/versions/v57.0.0/`.
  SDK 57 ships breaking changes; APIs remembered from older SDKs are likely wrong.
  Use `npx expo install <pkg>` to get SDK-compatible versions.

### What you do NOT do

- No hand-editing `ios/` or `android/` (they don't exist — Continuous Native
  Generation; configure via `app.json` and config plugins).
- No new dependencies without `npx expo install` and a reason.
- No raw hex colors, font sizes, or touch targets — extend `src/theme/index.ts` instead.
- No direct `Pressable` in screens/components for button-like actions (§5).
- No committing secrets, no git operations beyond what the user asks.

### Skills the AI is expected to apply

| Skill | Where it shows up |
|---|---|
| Expo Router conventions (file routes, `_layout.tsx`, `Stack.Protected`, `transparentModal` + `slide_from_bottom`) | `src/app/*` |
| React Native core (`Pressable`, `FlatList`, `Switch`, `TextInput`, a11y props) | Everywhere |
| Reanimated 4 (`useSharedValue`, `useAnimatedStyle`, `withSpring`/`withTiming`, `runOnJS`, `createAnimatedComponent`) | `Button.tsx`, `Sheet.tsx` |
| Gesture Handler 2 (`Gesture.Pan`, `activeOffsetY`, `onUpdate/onEnd`, `GestureDetector`) | `Sheet.tsx`, swipe rows |
| zustand stores + AsyncStorage persistence | `src/store/*` |
| Selectors & domain logic as pure functions (paise math, EMI schedules, month arithmetic) | `src/lib/*` |
| Theming & typography tokens | `src/theme/index.ts` |
| Accessibility: roles, labels, states, ≥44px targets, `hitSlop` | All interactive UI |
| React Compiler-era lint rules (`react-hooks/*`): no mutating shared values without justification | see §8 |

### Agent skill packs available in this workspace

Mostly irrelevant to day-to-day app work, listed for completeness:
`capacity`, `customize`, `deploy-model`, `finetuning`, `microsoft-foundry`,
`preset` (Azure Foundry model deployment), `report` (file an opencode issue),
`opencode` (questions about the agent harness itself). Do not use them for app code.

---

## 2. Repo map

```
src/
├─ app/                     Routes only. Every file is a screen; no business logic.
│  ├─ _layout.tsx           Fonts, providers, auth gate (Stack.Protected), modal opts
│  ├─ (auth)/login.tsx      Email + 6-digit code
│  ├─ (tabs)/               index · activity · plan · insights (custom TabBar)
│  ├─ add.tsx               Add/edit sheet (transparentModal). ?id= to edit
│  ├─ breakdown/[type].tsx  Category breakdown sheet
│  ├─ goal-new.tsx · loans.tsx · goals.tsx · settings.tsx · loan/[id].tsx · loan-new.tsx
├─ components/
│  ├─ ui/                   Button · AppText · Card · Chip · Money · MonthPill ·
│  │                        ProgressBar · ScreenHeader · Segmented · Sheet · SheetActions · Toggle
│  ├─ charts/               Sparkline · Donut · BarChart · ProgressRing (SVG)
│  ├─ EntryRow.tsx · PlanActualCard.tsx · MonthMenu.tsx · TabBar.tsx · Screen.tsx · AppLockGate.tsx
├─ lib/                     Pure functions only (no JSX): dates · money · selectors · emi · csv · categories · reminders
├─ store/                   zustand: auth · entries · loans · goals · settings · ui
├─ theme/                   colors · radius · space · type · font · hit (44)
├─ data/ · types.ts
```

Import alias: `@/` → `src/`.

---

## 3. Design tokens (`src/theme/index.ts`)

- **Colors**: semantic (`ink`, `primary`, `mint`, `canvas`, `card`, `border`, `text`, `textSoft`,
  `muted`, `income/expense/savings` + `*Tint` + text variants, `danger`). Never raw hex in screens.
- **Radius**: `chip 14 · card 20 · hero 24 · sheet 28 · pill 999`.
- **Type**: `display · title · heading · subheading · body · caption · label` — pass as `variant` to `AppText`; it carries family, size, letter-spacing.
- **Fonts**: `font.regular · medium · semibold · bold · extrabold` → Plus Jakarta Sans.
- **Touch target**: `hit = 44`. All interactive elements enforce `minHeight: 44`.

---

## 4. Component catalog (`src/components/ui/`)

| Component | Purpose | Notes |
|---|---|---|
| `Button` | **Action buttons only** — CTAs with a label. | §5 below |
| `AppText` | All text. | `variant`, `color`. No raw `<Text>`. |
| `Money` | All amounts (paise in). | Hides amounts when "Hide amounts" setting is on. |
| `Card` | White surface container. | `padding 0, overflow: 'hidden'` for flush lists. |
| `Chip` | Selectable pill. | Plain `Pressable` with its own layout — not `Button`. |
| `Segmented` | Small segmented control. | Plain `Pressable` — not `Button`. |
| `MonthPill` | Prev/month/next control. | Plain `Pressable` arrows. |
| `ScreenHeader` | Title + back chevron + right slot. | Back chevron = plain `Pressable` (icon-only `Button` 44×44 also acceptable). |
| `Sheet` | Modal bottom sheet. | Drag handle pans; backdrop tap dismisses. |
| `SheetActions` | 50/50 footer row for sheets. | Two `Button`s. |
| `Toggle` | Switch. | `trackColor` primary. |
| `ProgressBar` / charts | Progress display. | Ratio 0–1, clamped. |

Charts (`components/charts/`): `Sparkline` (balance trend), `Donut` (category share),
`BarChart` (income vs expense), `ProgressRing` (goal completion). SVG, no extra deps.

---

## 5. Buttons — when to use `Button`, when not to

`Button` is the shared component for **action buttons (CTAs)** — Save, Continue,
Sign out, Delete, SheetActions footers. It carries the press animation and the
vertical text centering. It is deliberately constrained to a labeled action layout;
do **not** bend it to fit list rows, cards, menu items, tab bars, section headers or
link-style text — those keep their own per-site `Pressable` styling.

### API

```tsx
<Button label="Save changes" />                          // primary CTA
<Button variant="outline" label="Copy plan from last month" icon={<Feather … />} />
<Button variant="danger" label="Delete entry" />          // destructive
<Button variant="ghost" label="Undo payment" height={44} />
```

**Props:** `label` (required) · `variant` (`primary` | `outline` | `danger` | `ghost`) ·
`icon` (left of label) · `loading` · `height` (visual height; 44px minimum touch target always applies) ·
`style` (applied last, wins) · all other `Pressable` props pass through.

**Variants:** `primary` (ink bg / white text) · `outline` (primary border) · `danger` (expenseTint bg / danger text) · `ghost` (transparent / primary text).

### The press effect (everywhere on action buttons)

- Reanimated spring: press-in → scale `0.96` (fast spring, `damping 18 / stiffness 420 / mass 0.7`); release → spring back with overshoot (`damping 13 / stiffness 300 / mass 0.9`).
- Opacity dips to `0.82` while pressed; `disabled` dims to `0.45` and blocks presses.
- `Haptics.selectionAsync()` on every press.
- Animated via `Animated.createAnimatedComponent(Pressable)` → runs on the UI thread, no JS-thread jank.
- `loading` swaps the content for an `ActivityIndicator`.

### Exact vertical text centering

Text sits exactly in the middle of the button on every platform:
`lineHeight: 20` (1.33× font size) + `includeFontPadding: false` (kills Android's built-in font padding)
+ `textAlignVertical: 'center'` (`includeFontPadding` alone is not enough — always set both)
+ single-line `numberOfLines={1}`. Icons render in a centered `View`; row gap `8`;
container is `alignItems: 'center' / justifyContent: 'center'`.

### Other touch surfaces — plain `Pressable`, styled per site

List rows (`EntryRow`, plan rows, EMI rows), tinted section headers (`SectionHeader` in plan.tsx),
menu rows (`MonthMenu`), cards (`Pressable` around `<Card>`), tab bar (`TabBar`), chips (`Chip`),
segmented controls (`Segmented`), swipe actions, "See all / See the full plan" link-style texts,
invisible backdrops (`Sheet`, `MonthMenu`). These own their layout; forcing them into `Button`
breaks both the component's contract and the visual design. `Pressable` supports `style={({ pressed }) => …}`
for cheap pressed feedback when you want it.

### Anti-patterns

- Stretching `Button` to a row/card via `children` or `alignSelf: 'stretch'` — that's why it was slimmed down; it won't accept children anymore.
- Making a second "IconButton"/"LinkButton" component when an existing `Pressable` site already fits.
- Wrapping `Button` in `View` just to center, with fixed heights that fight `minHeight: 44`.
- Hand-rolled `style={({ pressed }) => […scale…]}` on action CTAs — use `Button`.

---

## 6. Bottom sheets (`Sheet`)

```tsx
<Sheet footer={<SheetActions primaryLabel="Save" onPrimary={save} />}>
  {/* …form… */}
</Sheet>
```

- Rendered as a native `transparentModal` (`slide_from_bottom`); content is translucent so the page stays visible behind.
- **Drag handle**: `Gesture.Pan` on the handle strip only (never the whole sheet — it would fight scroll views). Rubber-band 0.25× above the resting position, 1:1 below; release past `translateY > 110` **or** fling with `velocityY > 650` → slides off (`withTiming`, 200ms) and calls `router.back()`; otherwise springs back (`damping 18 / stiffness 260 / mass 0.9`).
- The handle **animates while dragging** (widens `scaleX` to 1.45, color `switchOff → muted`) and the dismiss fires a light `Haptics.impactAsync(Light)`.
- Enlarged grab zone: padding around the 5px bar + `hitSlop={{ top: 10, bottom: 14, left: 80, right: 80 }}`.
- Tap the transparent backdrop to dismiss. Pass `maxHeight` as `'92%'` default.
- The container clips (`overflow: 'hidden'`), and every sheet screen must keep its content shrinkable — a `ScrollView` with `flexShrink: 1` inside the `KeyboardAvoidingView` — so when the form is taller than the screen (keyboard open, small device) the CTA footer (`SheetActions`) is **never** pushed below the sheet and clipped. `goal-new`, `loan-prepay`, `loan-new`, `breakdown` and `add` all follow this pattern; keep it when adding new sheets.
- If you add a new sheet screen: register it in `app/_layout.tsx` with `{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }`.

---

## 7. Clean code conventions

1. **Small, dedicated, reusable components.** If a visual pattern appears twice, extract it.
   `EntryRow`, `PlanActualCard`, `MonthPill`, `Chip` exist because they were repeated.
   One component = one responsibility; compose them rather than growing props forever.
2. **Routes stay thin.** Screens (`src/app/**`) do wiring only: read stores, derive with
   `useMemo` selectors from `lib/`, render components. No parsing, no formatting inline
   beyond what already exists.
3. **Pure logic lives in `lib/`** — dates (month keys), money (paise!), EMI schedule math,
   selectors, CSV. No JSX, no React imports → trivially testable and reusable.
4. **State lives in `store/` (zustand).** Selectors (`useEntries((s) => s.entries)`) not whole
   stores, to limit re-renders. Persisted slices use the AsyncStorage middleware.
5. **Amounts are paise** (integers) and always rendered via `<Money paise={…}>` / `formatINR`
   — never `.toFixed()` in a screen.
6. **Props interfaces** sit next to the component; shared domain types in `src/types.ts`.
   Components declare `Props` (not `any`), spread `...rest` onto the underlying element where sensible.
7. **Style arrays**: `[base, conditional, styleProp]` — caller's `style` last so it wins.
   No duplicate hex values; reach for tokens (§3).
8. **Comments explain *why*, not *what*.** Feature-section banners (`{/* Loans & EMI */}`) are
   welcome. No commented-out code.
9. **Naming**: `PascalCase` components/files for components, `camelCase` for lib/hooks,
   boolean props read like predicates (`loading`, `editing`). Event props: `onPress`, `onChange`.
10. **Error handling**: user-facing failures → `Alert.alert`; best-effort side effects
    (haptics, splash) → `.catch(() => {})`; confirmations for destructive actions before dispatching the store mutation.
11. **Accessibility is not optional**: roles, labels, `accessibilityState`, 44px targets,
    `hitSlop` on small glyphs.
12. **Do not grow a component past ~150 lines**; split into subcomponents in the same file
    (see `Screen`, `SheetActions`) or into `ui/`.

---

## 8. Expo / RN 57 practical notes

- **Docs first**: `https://docs.expo.dev/versions/v57.0.0/`. For anything non-obvious, fetch the
  page (e.g. `/sdk/reanimated/`). Never answer Expo API questions from memory.
- **Reanimated 4**: no babel plugin needed (`babel-preset-expo` handles it), requires
  `react-native-worklets` (already installed). Animate `Pressable` via
  `createAnimatedComponent`, mutate shared values only in handlers/gestures — the new
  `react-hooks/immutability` lint rule rejects them anywhere else. If a focused,
  justified disable is needed, write `// eslint-disable-next-line react-hooks/immutability`
  with a comment explaining why (see `Button.tsx` — shared values *are* mutated in press handlers by design).
- **React Compiler lint** in `expo lint`: `set-state-in-effect`, `immutability`,
  `static-components`. Don't create components inside render; don't set state synchronously in effects.
- **expo lint caches** results in `.expo/cache/eslint` — if you see phantom errors from a file
  you already fixed, delete that folder and re-run.
- **Node ≥ 20.19.4** required (older Node prints an unsupported-version warning).
- **expo-router**: `Stack.Protected guard={…}` for auth gating; `transparentModal` for sheets;
  `router.navigate` vs `router.push` (push for stack pushes, navigate to flip tabs);
  `router.back()` triggers native exit animation of modal screens.
- **expo-haptics**: `selectionAsync` for button presses, `impactAsync(Light)` for dismiss/snap events.

---

## 9. Known pre-existing issues (not introduced by UI work — fix only with owner's blessing)

- `src/components/AppLockGate.tsx:41` — `react-hooks/set-state-in-effect`
  (setState directly in effect body; should derive initial locked state from a subscription).
- `src/components/charts/Donut.tsx:19` — `react-hooks/immutability`
  (`offset += len` accumulates during render; pre-compute offsets before returning JSX).

Everything else flagged by `expo lint` is a regression — fix it.

---

## 10. Verification checklist before you say "done"

1. `npx tsc --noEmit` — zero errors.
2. `npx expo lint` — zero errors/warnings outside §9.
3. Smoke-test mentally (or on device): add entry → appears in Activity; swipe edit/delete;
   open a sheet → drag handle down → dismisses; tap backdrop → dismisses; buttons scale on
   press and text sits vertically centered; toggle "Hide amounts" in Settings.
4. `git status` — only intended files changed; note any pre-existing failures you observed.

## 11. Definition of a "consistent action button" to review PRs against

- [ ] CTA/action button → `Button` (keeps the shared press animation and text centering); non-CTA touch targets (rows, cards, menus, tabs, chips) → plain `Pressable` with per-site styling
- [ ] No `children`-mode hacks; `Button` takes a `label` and optional left `icon` only
- [ ] `accessibilityLabel` set where the label isn't visible; `accessibilityState` for toggles/selects
- [ ] ≥ 44px touch target; icon-only sites (chevrons, avatars) use a fixed `width`/`height` ≥ 44
- [ ] Text centered (`includeFontPadding: false` pipeline — reuse it, never reimplement)
- [ ] Colors from `theme.colors`, typography from `AppText` variants / the button's own label style
