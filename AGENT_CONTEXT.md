# Agent Context

This file captures repo-specific working context so future work does not have to rediscover it.

## Screenshot Note

- The user has already set up a screenshot workflow for the agent.
- Use `./ss.sh` for screenshotting.
- Do not assume screenshots are unavailable just because generic browser tooling is missing.
- If a screenshot is requested again, prefer `./ss.sh` instead of inventing a new workflow.

## Local Development

- Local dev uses `localhost` consistently.
- Client dev URL: `http://localhost:5173`
- Worker dev URL: `http://localhost:8787`
- Do not run local commands in this repo. This includes dev servers, builds,
  tests, local D1 migrations, deploy scripts, package scripts, and similar
  commands such as `pnpm run dev`, `pnpm run dev:client`,
  `pnpm run dev:server`, and `pnpm run d1:migrate:development`.
- If command execution is needed for verification or development, ask the user
  to run the command and share the result.

### Commands

- Start both: `pnpm run dev`
- Start client only: `pnpm run dev:client`
- Start server only: `pnpm run dev:server`
- Apply local D1 migrations: `pnpm run d1:migrate:development`

### Client

- Vite dev server lives in `client/`.
- `client/vite.config.ts` proxies `/api` to `http://localhost:8787`.
- `client/.env.local` was intentionally removed so the proxy path is used in local dev.

### Server

- Local Worker dev config: `server/wrangler.dev.jsonc`
- Local Worker env file: `server/.env`
- `server/.env` is the source of truth for local Worker env vars.
- `server/package.json` uses `wrangler dev --local --config ./wrangler.dev.jsonc`
- Local D1 migrations must use the same dev config so schema and runtime point at the same local DB.

## Production Workflow

- Production-only scripts live in `scripts/`.
- Production D1 migrations: `bash ./scripts/d1-migrate-production.sh`
- Production Worker deploy: `bash ./scripts/deploy-worker-production.sh`
- Shared production patch logic: `scripts/_production-common.sh`
- Old merged `worker.sh` flow was removed on purpose.
- Do not reintroduce combined “apply and deploy” behavior unless explicitly requested.

### Production Env Expectations

- Production commands require `ENV_FILE=...`
- Production env patching currently expects at least:
  - `D1_LEARN_GERMAN_UUID`
  - `DEPLOY_DOMAIN`
  - `ENVIRONMENT`
  - `TOTP_ENROLLMENT_TTL_HOURS`
  - `SESSION_TTL_DAYS`
  - `APP_NAME`
  - `TOTP_ISSUER`
  - `APP_BASE_URL`
  - `ALLOWED_ORIGIN`
  - `EMAIL_SENDER`
  - `RESEND_API_KEY`

## Email / TOTP

- Cloudflare email binding was removed.
- Resend is the only outbound mail provider now.
- Required deploy env for mail: `RESEND_API_KEY`
- `EMAIL_SENDER` is still required.

### TOTP Enrollment Rules

- In `development`, setup uses the dev echo path and does not send email.
- In non-development environments, setup must not use the dev echo path.
- Existing TOTP accounts are rejected during:
  - setup-link request
  - setup-link fetch
  - setup completion

### Enrollment Concurrency

- `totp_enrollments` now has one-row-per-email semantics.
- Schema adds a unique index on `totp_enrollments.email`.
- Setup creation uses `ON CONFLICT(email) DO UPDATE`.
- Active pending enrollment requests for the same email are rejected instead of creating multiple valid attempts.
- If schema behavior looks wrong in local/prod, re-run the appropriate D1 migration command.

## Sync UI

- The unauthenticated sync UI now uses a toggle between:
  - `Sign In`
  - `Set Up TOTP`
- Sign-in and sign-up no longer share the same email state.
- Sign-in and sign-up no longer share the same error surface.

## Known Tradeoffs

- Sync conflict handling is still intentionally permissive and client-trusting for now.
- Revision/timestamp hardening in sync was deferred intentionally and may need a later pass.
