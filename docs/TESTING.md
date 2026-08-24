# Testing Guide

How to verify changes locally before opening or updating a PR, and what CI enforces on `main`.

## Before every PR

Run this from the repo root:

```bash
# Frontend — unit tests + production build
npm run test:ci
npm run build

# Backend — API tests (mocked Supabase/Clerk; no secrets needed)
cd backend && npm test && cd ..

# Architecture guardrails
npm run check:architecture
```

Set these env vars for local builds if they are not already in `.env`:

```bash
export REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
export REACT_APP_API_URL=http://localhost:3001/api/v1
```

## If you changed…

| Area changed | Required commands |
|--------------|-------------------|
| `src/utils/*` | `npm test -- <helper-name>` (e.g. `npm test -- dateHelpers`) |
| `src/components/*` or `src/pages/*` | `npm run test:ci` + manual smoke steps below |
| `backend/src/routes/*` or `backend/src/middleware/*` | `cd backend && npm test` — **add or update tests** in `backend/tests/` |
| Reminder email (`backend/src/lib/reminderEmail.js`, `clerkEmail.js`, auth email backfill) | `cd backend && npm test -- reminderEmail clerkEmail auth` |
| `backend/src/lib/validation.js` | `cd backend && npm test -- validation` |
| `docs/*-migration.sql` or `supabase/migrations/*` | Manual: run migration on a dev Supabase project; document steps in the PR |
| Dashboard share links (`share_links`, `/share/:token`, `shareLinkService`) | `cd backend && npm test -- share-links`, `npm run test:ci`, `npm run build`, manual flow in [`docs/share-links.md`](share-links.md#manual-verification) |
| Interview rounds (`backend/src/routes/opportunity-rounds.js`, `src/components/rounds/*`) | `cd backend && npm test -- rounds`, manual flow in [`docs/interview-rounds.md`](interview-rounds.md#testing) |
| Interview prep (`backend/src/routes/interview-prep.js`, `src/components/interview-prep/*`) | `cd backend && npm test -- interview-prep`, manual flow in [`docs/interview-prep.md`](interview-prep.md#testing) |
| ATS scorer (`src/utils/atsScorer.js`, `DocumentUpload.jsx`) | `npm test -- atsScorer`, upload PDF/DOCX on `/documents` |
| Chrome extension (`extensions/**`) | `cd extensions && npm ci && npm test && npm run build`; follow the extension manual flow below |

### Backend route changes require tests

Any change to `backend/src/routes/` or request validation must include tests under `backend/tests/`. CI runs `npm test` in `backend/` on every PR.

### No direct Supabase CRUD from the frontend

All data mutations and reads go through the Express API (`REACT_APP_API_URL`). The frontend Supabase client is for **realtime only** (`src/pages/StatusBoard.jsx`). `npm run check:architecture` fails if `supabase.from(` appears elsewhere in `src/`.

## Manual smoke checklist

Use this after automated tests pass:

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm start` (separate terminal)
3. Sign in with Clerk (Google, GitHub, or email)
4. Open the page(s) you changed
5. Exercise the happy path once
6. Try one edge case (empty state, invalid input, expired deadline, etc.)
7. If you touched auth or API wiring: hard-refresh and confirm data still loads on first paint

### Dashboard share links (if you changed sharing)

See [`docs/share-links.md`](share-links.md).

1. Open `/dashboard` while signed in and click **Share Dashboard**.
2. Generate a link with opportunities that include descriptions, deadlines, and application links.
3. Open it in a signed-out/private browser session and confirm the opportunity details and **Apply / Open opportunity** links work.
4. Refresh the public link more than once and confirm it remains viewable while active.
5. Copy the same active URL again from **Active Share Links**.
6. Generate a passcode-protected link and verify wrong and correct passcodes.
7. Revoke a link from the dashboard and confirm the public page shows the expired/revoked state.
8. Confirm the public response and UI do not expose owner identity, notes, documents, or prep data.

```bash
cd backend && npm test -- share-links
```

### Interview rounds (if you changed round API or UI)

See [`docs/interview-rounds.md`](interview-rounds.md#testing).

1. Open an internship → detail drawer → **Interview Pipeline**
2. Add a pending round with a date and time — save should complete quickly and the timeline should show both (toast + timeline without long **Saving…**)
3. Edit result to `rejected` — status badge and card summary update
4. Confirm hackathon detail drawer has **no** rounds section

```bash
export CLERK_TOKEN="<paste from browser Clerk session>"
./scripts/test-rounds-api.sh
```

### Interview prep (if you changed prep API or UI)

See [`docs/interview-prep.md`](interview-prep.md#testing).

1. Open an internship → detail drawer → **Interview Prep**
2. Confirm route `/internships/<id>/prep` loads all tabs
3. Add a question and mark it prepared — progress bar updates
4. Save company research and reflection — persists after refresh
5. Confirm hackathon detail has **no** Interview Prep button

```bash
cd backend && npm test -- interview-prep
```

### Documents & ATS (if you changed upload or scorer)

See [`docs/documents-and-ats.md`](documents-and-ats.md).

1. Go to **Documents** → upload a PDF or DOCX resume
2. Confirm ATS breakdown appears before save
3. Save — `ats_score` visible on document card
4. Assign document to an internship from opportunity flow

```bash
npm test -- atsScorer
```

### Chrome MV3 extension (if you changed `extensions/`)

1. Configure `extensions/.env` with the Clerk publishable key, API base URL, and sync host.
2. Confirm the extension's deterministic `chrome-extension://` origin is allowed in Clerk and backend `CORS_ORIGIN`.
3. Run `cd extensions && npm ci && npm test && npm run build`.
4. In `chrome://extensions`, enable Developer mode and load `extensions/dist`.
5. While signed in at the sync host, open a LinkedIn, Greenhouse, or Lever listing, click the extension icon to open the **side panel**, review the prefilled title/description/URL, append a second selected paragraph without the panel closing, save, and confirm the opportunity in the dashboard.

See [`extensions/readme.md`](../extensions/readme.md) for the complete setup and example listing pages.

### Optional Resend deadline emails (if you changed reminder delivery)

1. Confirm `GET /api/v1/health/deps` shows `checks.reminderEmail.enabled: true` after setting `REMINDER_EMAILS_ENABLED`, `RESEND_API_KEY`, and `REMINDER_EMAIL_FROM`.
2. Sign in, open **Notifications**, and turn on **Email deadline reminders**.
3. Create or update a hackathon whose submission date is 1 or 7 days away so the outbox enqueues a job.
4. Dispatch with `POST /api/v1/internal/jobs/dispatch` using `JOB_DISPATCH_TOKEN`, or wait for the GitHub Actions workflow.
5. Confirm a Resend message arrives at the Clerk primary email. If `users.email` was empty, the send should backfill it and still deliver.
6. A missing Clerk email should leave the in-app notification in place and log `REMINDER_EMAIL_SKIPPED_NO_RECIPIENT` without printing the address.

```bash
cd backend && npm test -- reminderEmail clerkEmail auth
```

## What CI runs

GitHub Actions workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every PR to `main` and on pushes to `main`:

| Job | What it does |
|-----|----------------|
| **frontend** | `npm ci`, `npm run build`, `npm run test:ci` |
| **backend** | `cd backend && npm ci && npm test` |
| **architecture** | `npm run check:architecture` |
| **extension** | `cd extensions && npm ci && npm test && npm run build` |
| **audit** | Root and backend `npm audit --audit-level=high` (informational; does not block merge) |

No Clerk or Supabase secrets are required in CI — backend tests mock auth and the database client.

## Enable branch protection (maintainers)

After this workflow is on `main`, require status checks so merges are blocked when CI fails:

1. GitHub → **Settings** → **Branches** → branch protection rule for `main`
2. Enable **Require status checks to pass before merging**
3. Require at least:
   - `frontend`
   - `backend`
   - `architecture`
   - `extension`
4. Keep **Require pull request reviews** enabled for GSSoC assignment flow

## Running a single test file

```bash
# Frontend
npm test -- dateHelpers --watchAll=false

# Backend
cd backend && npm test -- opportunities
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `App.test.js` fails locally | Run `npm run test:ci` (not watch mode). Ensure `REACT_APP_*` env vars are set. |
| Backend tests fail with missing env | Tests use defaults in `backend/tests/setup.js`; no real `.env` needed. |
| `architecture-check` fails on `supabase.from` | Move data access to a backend route; frontend should call `src/services/api.js`. |
| Build fails on Clerk key | Set `REACT_APP_CLERK_PUBLISHABLE_KEY` (any non-empty placeholder works for CI). |
