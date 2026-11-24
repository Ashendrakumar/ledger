# Ledger API

Standalone Node.js + MongoDB backend scaffold. It does not import from or call the Expo application.

## Requirements

- Node.js 22 or newer
- MongoDB 7 or compatible MongoDB deployment

## Run locally

1. Copy `.env.example` to `.env` and replace both placeholder secrets with random values of at least 32 characters.
2. Start MongoDB locally or set `MONGODB_URI` to a development database.
3. Run `npm install`, then `npm run dev`.
4. Request `POST /api/v1/auth/email/send` with `{ "email": "you@example.com" }`. In development, the OTP is printed in the backend terminal.
5. Verify using `POST /api/v1/auth/email/verify` with the email and six-digit code.

`GET /api/v1/health` reports Mongo readiness. The route and sync contract is documented in [API.md](./API.md). `GET /api/v1/me/export` downloads an authenticated JSON export including tombstones; `DELETE /api/v1/me` permanently deletes an account and its primary database records.

## Current limits

The development code transport only logs to the server console. Production startup checks for mail configuration, but a production email provider adapter still must be implemented; setting those variables alone does not send mail. OTP send has Mongo-backed hourly per-email and per-IP throttles; an edge-level limiter is still recommended. Financial CRUD, idempotent creates, conditional conflict checks, bootstrap, delta sync, JSON export, and account deletion are implemented. Production deployment and complete Expo record sync remain outstanding. See [ASYNC_STORAGE_MIGRATION.md](../docs/ASYNC_STORAGE_MIGRATION.md) for the local-cache migration sequence.
