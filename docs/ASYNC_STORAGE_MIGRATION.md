# AsyncStorage to account sync migration

This migration is a client-side, offline-first operation. Keep the existing local stores as the working cache and use the authenticated backend as the cross-device copy. Do not clear local storage until a full bootstrap or upload has been acknowledged.

## Resource mapping

| Local store | API resource | Stable ID | Notes |
| --- | --- | --- | --- |
| `ledger.entries` | `entries` | `Entry.id` | Preserve kind, type, integer paise, month, date, category, note, and loan-payment link. |
| `ledger.goals` | `goals` | `Goal.id` | Preserve target and saved paise. |
| `ledger.loans` loans | `loans` | `Loan.id` | Do not upload the derived `emiPaise`; the API computes it from principal, annual rate, and tenure. |
| `ledger.loans` payments | `loan-payments` | `LoanPayment.id` | Preserve `loanId` and payment kind. Upload loans before payments. |

## First sign-in flow

1. Authenticate and store the refresh token only in platform secure storage. Keep access tokens in memory where practical.
2. Read the existing AsyncStorage snapshots without mutating them. Validate each row against the API contract and report invalid rows to the user for repair or export.
3. Upload loans, then goals and entries, then loan payments. Always pass the existing local `id` as `clientId`; retry the same payload after network failures.
4. Treat `200` idempotent create responses as success. Treat `409 CLIENT_ID_CONFLICT` as a merge conflict requiring a fetch and user-safe resolution; never silently replace the local record.
5. Call onboarding completion only for first setup, with stable entry IDs. It is safe to retry.
6. After uploads are acknowledged, bootstrap all pages, merge by resource and client ID, then persist the merged cache. Preserve unsynced local edits in a durable outbox.

## Ongoing sync policy

Persist the last completed delta cursor per signed-in account. Fetch changes, apply updates and tombstones idempotently, and advance the cursor only after local persistence succeeds. Queue offline mutations with a stable ID and retry with backoff. For edits, send `If-Match` using the version read from the server. On `409 VERSION_CONFLICT`, fetch the latest version and resolve field-level differences before retrying. Isolate caches and cursors by account; clear the in-memory session and outbox on sign-out, but retain the local account cache only according to an explicit product setting.

CSV import/export remains on-device for now. Import validation must reject malformed dates/months, negative or unsafe paise, and rows without required fields; deduplication should use stable IDs only when the source provides them, otherwise show a preview and require user confirmation before importing.

For a future CSV import UI, cap files at 5 MiB, show a preview before writes, and report row-numbered validation errors instead of silently dropping invalid rows. The current local parser behavior needs to be brought up to that contract as part of Expo integration.
