# Ledger API contract

Base URL path: `/api/v1`. All private routes require `Authorization: Bearer <accessToken>`.

Compatibility policy: compatible additions may be released under the current version. Changes that remove or redefine fields, status codes, or sync semantics require a new `/api/vN` path and a documented migration window.

## Authentication

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/email/send` | Request a sign-in code. Response is generic to avoid account discovery. |
| POST | `/auth/email/verify` | Verify the code and receive access/refresh tokens. |
| POST | `/auth/refresh` | Rotate a refresh token. |
| POST | `/auth/logout` | Revoke the refresh token in the request body. |
| GET | `/me` | Return the current account profile. |
| GET | `/me/export` | Download the account profile and all financial records as JSON. Tombstones are included for completeness. |
| DELETE | `/me` | Permanently delete the account, synced financial records, refresh sessions, OTP challenges, and email rate-limit key. Retrying is safe while deletion is pending. |

## Financial resources

Entries, goals, loans, and loan payments each provide `GET` and `POST` on their collection and `GET`, `PATCH`, and `DELETE` on `/:id`. IDs are client IDs scoped to the authenticated account. Collection reads accept `limit` (1–100), `cursor`, and `updatedAfter`; entries additionally accept `month`, `kind`, and `type`; payments accept `month` and `loanId`.

Every create should include a stable `clientId`. Repeating the same create with the same ID and payload returns `200` with `idempotentReplay: true`. Reusing an ID with a different payload or a previously deleted ID returns `409 CLIENT_ID_CONFLICT`. Omitting `clientId` is supported for legacy callers but cannot provide retry idempotency.

PATCH is last-write-wins by default for compatibility. Clients that have the version they read should send it in `If-Match` as the exact ISO `updatedAt` value returned by the API. A stale version returns `409 VERSION_CONFLICT` and includes the latest `serverUpdatedAt` where available. Clients should fetch the current record, merge deliberately, and retry; do not blindly retry a stale patch.

DELETE creates a tombstone. The tombstone remains in delta sync and is omitted from ordinary collection reads. Recreating a deleted record requires a new client ID.

Deleting a loan with active payments returns `409 RECORDS_LINKED`; delete its payments first. Deleting a loan payment referenced by an active ledger entry returns the same status; delete or unlink the entry first. These checks reduce orphaned links but do not replace multi-document transactions under concurrent writes.

## Sync and onboarding

- `GET /sync/bootstrap` returns paginated account and resource snapshots. Each resource has an independent client-ID cursor.
- `GET /sync/changes` returns timestamp-ordered changes and tombstones using an opaque account-bound cursor. Apply records idempotently by resource and client ID.
- `POST /onboarding/complete` upserts initial planned entries by client ID and marks setup complete. An empty entries array can mark setup complete without creating entries. Repeating it is safe; multi-document transaction atomicity is not guaranteed.

## Status and errors

Validation errors use `400 VALIDATION_ERROR`; missing records use `404 NOT_FOUND`; authentication failures use `401 UNAUTHORIZED`; stale writes and client-ID reuse use `409`; throttled OTP sends use `429 RATE_LIMITED`. Responses include an `x-request-id` for support correlation. Financial amounts are safe integer paise.

## Data portability and retention

The export and deletion routes are authenticated and audited. Export includes current records and tombstones, and should be stored by the user as sensitive financial data. Deletion permanently purges the account's primary database records; backup expiry and retention policy still need to be set for the production environment.
