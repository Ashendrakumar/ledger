# Ledger (Expo + React Native)

Expense, income and savings tracker with a **Planned vs Actual** model per month.
Layouts follow the "Ledger: React Native App Design" canvas.

## Run

```bash
npm install
npx expo start        # press i / a, or scan with Expo Go
npm run typecheck
```

Prototype sign-in: enter any email, then any 6 digits.

## Stack

Expo SDK 57 · TypeScript · Expo Router (file-based, built on React Navigation) · zustand + AsyncStorage ·
react-native-svg (charts) · react-native-gesture-handler (swipe rows) · Plus Jakarta Sans.

## Architecture

```
src/
├─ app/                       Routes only. Every file is a screen.
│  ├─ _layout.tsx             Fonts, providers, auth gate (Stack.Protected)
│  ├─ (auth)/login.tsx        Email + 6-digit code
│  ├─ (tabs)/                 Floating custom TabBar
│  │  ├─ index.tsx            Home: balance hero, plan vs actual cards, recent
│  │  ├─ activity.tsx         Actual | Planned, search, filters, swipe edit/delete
│  │  ├─ plan.tsx             Monthly plan, copy from last month
│  │  └─ insights.tsx         Donut, income vs expenses, savings rate, alerts
│  ├─ add.tsx                 Add / edit sheet (transparentModal). ?id= to edit
│  ├─ breakdown/[type].tsx    Category breakdown sheet (expense | income | saving)
│  ├─ goals.tsx               Goal rings
│  └─ settings.tsx            Preferences, CSV export, sign out
├─ components/
│  ├─ ui/                     Button, Chip, Segmented, Toggle, Card, ProgressBar,
│  │                          Money, AppText, Sheet, ScreenHeader, MonthPill
│  ├─ charts/                 Sparkline, Donut, BarChart, ProgressRing (SVG)
│  └─ TabBar, EntryRow, PlanActualCard, Screen
├─ store/                     zustand: entries, goals, settings, auth, ui (month)
├─ lib/                       money (paise + INR grouping), dates, selectors, csv, categories
├─ data/seed.ts               Sample data (Oct 2026)
├─ theme/index.ts             Colours, radii, spacing, type scale (single source)
└─ types.ts                   Entry, Goal, User
```

### Rules the code follows

- **Money is integer paise.** Convert at the edges (`toPaise`, `formatINR`). Balance = actual income − expenses − savings, across all months.
- **Entries are one table.** `kind: 'actual' | 'planned'`; actual rows have `date`, planned rows only `month`.
- **Screens read selectors, not raw arrays** (`lib/selectors.ts`), so swapping AsyncStorage for SQLite only touches `store/`.
- **All amounts render through `<Money>`**, so "Hide amounts" works everywhere.
- **Touch targets are 44 or larger. Over-budget shows an icon and words, not colour alone.**

## Not built yet

- Backend for the email code (`store/auth.ts` is a local stub).

- Notifications for budget alerts and bill reminders (`expo-notifications`).
- Import from CSV, light/dark theme.
- Insights amounts in the donut centre ignore "Hide amounts".
