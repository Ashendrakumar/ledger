# Ledger Backend Plan (Node.js + MongoDB)

Status reflects this repository on 2026-11-24. The Expo client now uses backend OTP auth, secure native refresh-token storage, queued onboarding upload, JSON export, and account deletion; per-resource offline sync remains pending.

## Decisions

- **Runtime:** Node.js 22 LTS, TypeScript, Fastify, Mongoose, MongoDB.
- **Shape:** versioned REST API, modular monolith. Keep domain logic in services and persistence behind repositories so the app can evolve without microservices.
- **Money:** integer paise only; validate safe integers and never use floating-point currency.
- **Ownership:** every private record is scoped by authenticated `userId`; clients cannot choose another owner's ID.
- **Offline-first client:** future app integration should keep a local cache and sync through stable IDs, timestamps, and a change cursor. Backend remains authoritative for account and synchronized records.
- **No secrets in source:** environment variables for database, token, mail, and deployment configuration.

## Product scope mapped from the app

Current app features include email-code sign-in, first-month onboarding plan, actual and planned income/expense/savings entries, monthly plans, goals, loans, EMI/prepayments, insights derived from ledger data, settings, local app lock, notifications, and CSV import/export. The server owns identity and synchronized financial records. Theme, hide-amounts, biometric/app lock, and device notification scheduling remain device-local; push token registration can be added later if remote notifications are introduced.

## Phase tracker

### Phase 1 — Backend foundation and email OTP auth

- [x] Create isolated backend package and TypeScript build/run scripts.
- [x] Add environment validation, Fastify server, Mongo connection, and health/readiness endpoint.
- [x] Add OTP request/verify flow with normalized email, hashed codes, expiry, attempt limit, and resend cooldown.
- [x] Add access/refresh token issuance, refresh rotation, logout/revocation primitives, and authenticated `/me` route.
- [x] Add development-only mail transport that logs a code only in development; production requires mail configuration.
- [ ] Connect a real email provider and configure production secrets.
- [ ] Add automated integration tests and CI checks. (No Mongo test service or CI workflow is configured yet.)
- [ ] Deploy a development MongoDB/API environment and document operational access.

### Phase 2 — Financial data model and CRUD API

- [x] Add strict schemas and indexes for ledger entries, goals, loans, and loan payments.
- [x] Add authenticated CRUD/list endpoints with cursor pagination, month/type filters, validation, and ownership enforcement.
- [x] Preserve app semantics: entries have `actual | planned`, `expense | income | saving`; actual dates and month keys are validated; loan payment links are checked against the authenticated owner.
- [x] Add soft-delete/tombstone behavior so offline clients can sync deletions.
- [ ] Add database transactions for linked loan-payment/ledger-entry updates where supported. API deletion guards now prevent deleting linked loans and payments while active dependents exist.

### Phase 3 — Sync and onboarding

- [x] Add client-generated stable IDs, idempotent create retries, `createdAt`/`updatedAt`, and optional optimistic conflict detection with server conflict metadata.
- [x] Add authenticated delta-sync endpoint using opaque account-bound cursor and tombstones.
- [x] Add paginated bootstrap endpoint returning account profile and entries, goals, loans, and payments.
- [x] Add idempotent onboarding completion endpoint that upserts initial planned entries by stable client ID; transaction-level atomicity remains open.
- [x] Define migration/import strategy for existing AsyncStorage data before app integration.

### Phase 4 — Derived views and data portability

- [x] Keep balances, charts, budgets, and EMI schedules derived from canonical records; no summary endpoint is currently needed.
- [ ] Match client paise and EMI rounding rules with shared fixtures and parity checks.
- [x] Keep CSV processing on-device for now and document validation and duplicate-handling expectations.

### Phase 5 — Hardening and production readiness

- [x] Add Mongo-backed hourly per-email/per-IP OTP-send rate limits.
- [x] Add security headers, configured CORS allowlist, request IDs, request size limit, and redacted structured logs. Edge-wide rate limits remain a deployment task.
- [x] Add audit events for auth, data export, and account deletion; never log OTPs, tokens, or financial payloads.
- [ ] Define backup expiry/retention policy and run backup/restore drills. Authenticated export and resumable account deletion workflows are implemented; production retention remains open.
- [ ] Add monitoring, alerts, and deployment runbook. Mongo ping health/readiness and graceful shutdown are implemented; monitoring and deployment runbook require an environment.
- [x] Add API contract documentation and compatibility/versioning policy.

### Phase 6 — Expo integration (in progress)

- [x] Replace local auth stub with OTP API flow and secure refresh-token storage on native devices.
- [ ] Replace AsyncStorage-only domain persistence with local cache + queued sync while preserving offline use. Onboarding plans now queue and retry; per-resource sync is not implemented.
- [ ] Add retry/backoff, conflict UI where needed, sign-out cleanup, and account-switch isolation.
- [ ] Verify app behavior across Android/iOS and production builds.

## Phase 1 API contract implemented

Base path: `/api/v1`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | Liveness and Mongo readiness |
| POST | `/auth/email/send` | No | Request a six-digit email code |
| POST | `/auth/email/verify` | No | Verify code and issue token pair |
| POST | `/auth/refresh` | No | Rotate refresh token and issue a new pair |
| POST | `/auth/logout` | Bearer | Revoke the presented refresh session |
| GET | `/me` | Bearer | Return authenticated account profile |

Auth response token fields are groundwork for future client integration. Store refresh tokens only in secure device storage when the app is eventually wired. OTP responses deliberately do not include the code in production.

## Phase 2 API contract implemented

All resource routes require `Authorization: Bearer <accessToken>`. Collection GET endpoints accept `limit` (1–100), `cursor`, and `updatedAfter`; entries additionally accept `month`, `kind`, and `type`; loan payments additionally accept `month` and `loanId`. Collection responses contain `data` and `nextCursor`. Create accepts an optional client ID and returns `201`; patch updates provided fields; delete creates a tombstone and returns `204`. Loan responses calculate `emiPaise` using the app's paise rounding formula.

| Method | Path | Purpose |
|---|---|---|
| GET / POST | `/api/v1/entries` | List or create actual/planned ledger entries |
| GET / PATCH / DELETE | `/api/v1/entries/:id` | Read, edit, or tombstone an entry |
| GET / POST | `/api/v1/goals` | List or create savings goals |
| GET / PATCH / DELETE | `/api/v1/goals/:id` | Read, edit, or tombstone a goal |
| GET / POST | `/api/v1/loans` | List or create loans |
| GET / PATCH / DELETE | `/api/v1/loans/:id` | Read, edit, or tombstone a loan |
| GET / POST | `/api/v1/loan-payments` | List or create actual/planned/prepayment records |
| GET / PATCH / DELETE | `/api/v1/loan-payments/:id` | Read, edit, or tombstone a loan payment |

These endpoints are implemented but do not yet have automated integration coverage. Their collection cursor is an ID cursor for stable browsing. The updated-record delta cursor is described below.

## Phase 3 API contract implemented

- `GET /api/v1/sync/bootstrap?limit=100&entriesCursor=...&goalsCursor=...&loansCursor=...&loanPaymentsCursor=...` returns the account and independently paginated snapshots for each resource.
- `GET /api/v1/sync/changes?cursor=...&limit=50` returns timestamp-ordered changes across all resources, including tombstones. The opaque cursor is bound to the authenticated account. A one-second overlap is used on completed pages to reduce missed writes at millisecond timestamp boundaries; clients must apply changes idempotently by resource + client ID.
- `POST /api/v1/onboarding/complete` accepts planned entries with client IDs and idempotently upserts them before setting the account setup flag. It can be retried after partial writes; multi-document transaction guarantees are still pending.

## Data model target (Phase 2)

- `User`: normalized unique email, optional display name, verified timestamp, account status.
- `AuthChallenge`: normalized email, OTP hash, expiry, attempts, resend window, consumed timestamp; automatically expired records.
- `RefreshSession`: user, token hash, rotation family, expiry, revoked/replaced timestamps, device metadata with minimal collection.
- `Entry`: owner, client ID, kind, type, amount paise, category, month, optional date/note/loan payment reference, timestamps, tombstone.
- `Goal`: owner, name, target/saved paise, target month, timestamps, tombstone.
- `Loan`: owner, name, principal paise, annual rate, tenure, start month, due day, expense tracking flag, timestamps, tombstone. EMI is derived by shared domain rules.
- `LoanPayment`: owner, loan reference, month, amount paise, payment kind/date/note, timestamps, tombstone.
- Unique owner + client ID indexes provide idempotent writes. Query indexes begin with owner and commonly-filtered month/date fields.

## Security and behavior requirements

- Generic OTP-send response prevents account discovery; a Mongo-backed per-email/per-IP hourly throttle is implemented for OTP send, with edge-level throttling still needed in deployment.
- Store only OTP and refresh token hashes. OTP is one-time, expires quickly, and has bounded verification attempts.
- Use short-lived signed access tokens and rotating opaque refresh tokens; revoke token families on reuse detection.
- Validate every request at the boundary; reject malformed month/date keys, invalid enum values, negative amounts, unsafe integers, and oversized notes.
- Use HTTPS in deployed environments, least-privilege Mongo credentials, encrypted backups, and secret rotation.
- Never add bank credential collection, account aggregation, or payment initiation without a separate product/security review.

## Local development

From `backend/`: `npm install`, copy `.env.example` to `.env`, start MongoDB, then `npm run dev`. `npm run build` compiles TypeScript and `npm start` runs the compiled server. Development mail logs a one-time code to the backend process output; this is disabled in production.

## Definition of done per phase

Each phase needs schema/API documentation, input and authorization validation, migration/compatibility notes, automated tests, lint/typecheck/build checks, and a review of secrets/logging. A phase is not complete merely because its routes compile.
