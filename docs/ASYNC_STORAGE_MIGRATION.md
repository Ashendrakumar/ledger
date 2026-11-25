# AsyncStorage to account sync migration

This migration is implemented as a client-side, offline-first operation. Existing local stores remain the working cache and the authenticated backend provides cross-device sync. The first authenticated account adopts and uploads the existing local data. Later accounts receive a separate local cache. Do not clear local storage until a full bootstrap or upload has been acknowledged.

## Resource mapping

| Local store | API resource | Stable ID | Notes |
| --- | --- | --- | --- |
| `ledger.entries` | `entries` | `Entry.id` | Preserve kind, type, integer paise, month, date, category, note, and loan-payment link. |
| `ledger.goals` | `goals` | `Goal.id` | Preserve target and saved paise. |
| `ledger.loans` loans | `loans` | `Loan.id` | Do not upload the derived `emiPaise`; the API computes it from principal, annual rate, and tenure. |
| `ledger.loans` payments | `loan-payments` | `LoanPayment.id` | Preserve `loanId` and payment kind. Upload loans before payments. |

## Implemented first sign-in flow

1. Authenticate and store the refresh token in SecureStore on native devices; access tokens stay in memory and refresh automatically on `401`.
2. The first signed-in account claims the existing AsyncStorage cache. A durable account-specific outbox uploads local rows with their existing IDs as `clientId`.
3. Upload ordering respects loan/payment/entry references. Creates are idempotent; edits use conditional updates and newer remote changes are retained when they win the timestamp comparison.
4. Bootstrap pages are merged into the local cache after queued changes are acknowledged. Account changes save and restore per-account snapshots.
5. Failed requests remain queued and retry with capped exponential backoff. Delta cursors advance after applying and persisting each page.

## Ongoing sync policy

Persist the last completed delta cursor per signed-in account. Fetch changes, apply updates and tombstones idempotently, and advance the cursor only after local persistence succeeds. Queue offline mutations with a stable ID and retry with backoff. For edits, send `If-Match` using the version read from the server. On `409 VERSION_CONFLICT`, fetch the latest version and resolve field-level differences before retrying. Isolate caches and cursors by account; clear the in-memory session and outbox on sign-out, but retain the local account cache only according to an explicit product setting.

CSV import/export remains on-device for now. Import validation must reject malformed dates/months, negative or unsafe paise, and rows without required fields; deduplication should use stable IDs only when the source provides them, otherwise show a preview and require user confirmation before importing.

For a future CSV import UI, cap files at 5 MiB, show a preview before writes, and report row-numbered validation errors instead of silently dropping invalid rows. The current local parser behavior needs to be brought up to that contract as part of Expo integration.
