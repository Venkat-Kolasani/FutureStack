# Codebase Guide

Quick orientation for contributors, reviewers, and technical interviews. Read this before diving into individual feature docs. For availability and rollout state, see [PROJECT_STATUS.md](PROJECT_STATUS.md).

## What is FutureTracker?

A full-stack React + Express app that helps students track internships and hackathons: Kanban status board, analytics, documents, multi-round interview pipelines, per-internship prep workspaces, and hackathon team collaboration.

| Environment | URL |
|-------------|-----|
| Frontend | [futuretracker.online](https://futuretracker.online) |
| Backend API | [futurestack-api.onrender.com/api/v1](https://futurestack-api.onrender.com/api/v1) |
| Service status | [UptimeRobot](https://stats.uptimerobot.com/ArICmEg95Y) |

---

## Repository layout

```
FutureStack/
├── src/                          # React frontend (Create React App)
│   ├── App.js                    # Routes, lazy loading, analytics
│   ├── pages/                    # One file per route (see table below)
│   ├── components/               # UI by domain (common, opportunities, interview-prep, …)
│   ├── services/api.js           # Axios client + all API service objects
│   ├── hooks/useAuthToken.js     # Registers Clerk JWT getter for API
│   ├── lib/supabase.js           # Realtime client ONLY (not CRUD)
│   └── utils/                    # Pure helpers (dates, PDF export, ATS scorer)
├── backend/
│   └── src/
│       ├── app.js                # Express app, middleware, route mounting
│       ├── middleware/auth.js    # Clerk JWT → internal user id
│       ├── routes/               # REST handlers per domain
│       ├── validation/           # Zod/Joi-style request schemas
│       └── lib/                  # Supabase admin client, sync helpers
├── docs/                         # Feature guides, migrations, testing
└── scripts/                      # architecture-check, verify-rounds-schema
```

---

## Golden rules

1. **All data through the API** — Frontend must not call `supabase.from()` except realtime in `StatusBoard.jsx`. Enforced by `npm run check:architecture`.
2. **Auth on every protected route** — `requireAuth` middleware; handlers use `req.auth.internalUserId`.
3. **Internship-only features** — Interview rounds and interview prep reject non-internship opportunities server-side.
4. **Migrations in `docs/` and `supabase/migrations/`** — SQL files are the source of truth; apply them manually in Supabase in documented order.
5. **Tests for backend routes** — Changes under `backend/src/routes/` need tests in `backend/tests/`.

---

## Request flow (mental model)

```mermaid
sequenceDiagram
    participant R as React page
    participant A as src/services/api.js
    participant E as Express + auth.js
    participant S as Supabase (service role)

    R->>A: opportunityService.getAll()
    A->>E: GET /api/v1/opportunities + Bearer JWT
    E->>E: Verify Clerk token, resolve user id
    E->>S: SELECT … WHERE user_id = ?
    S-->>E: rows
    E-->>A: JSON
    A-->>R: setState / render

    Note over R,S: StatusBoard also subscribes to Supabase Realtime<br/>to trigger refetch (not direct CRUD)
```

---

## Frontend routes

| Path | Page | Auth | Notes |
|------|------|------|-------|
| `/` | `Home.jsx` | Public | Landing + footer status link |
| `/share/:token` | `PublicSharePage.jsx` | Public | Read-only redacted opportunity share, optional passcode |
| `/dashboard` | `Dashboard.jsx` | ✅ | Stats, deadlines |
| `/internships` | `InternshipList.jsx` | ✅ | Detail drawer → rounds + prep |
| `/internships/:id/prep` | `InterviewPrepDetail.jsx` | ✅ | Interview prep workspace |
| `/hackathons` | `HackathonList.jsx` | ✅ | |
| `/hackathons/:id` | `HackathonDetail.jsx` | ✅ | Team, ideas, tasks, checklist |
| `/status-board` | `StatusBoard.jsx` | ✅ | Kanban + realtime |
| `/calendar` | `Calendar.jsx` | ✅ | |
| `/documents` | `Documents.jsx` | ✅ | Upload, document links, ATS analysis, and gated AI controls |
| `/analytics` | `Analytics.jsx` | ✅ | Charts + rejection insights |
| `/reports` | `Reports.jsx` | ✅ | PDF export |
| `/add`, `/edit/:id` | Add/Edit opportunity | ✅ | |

---

## Backend route modules

| Mount path | File | Domain |
|------------|------|--------|
| `/api/v1/opportunities` | `routes/opportunities.js` | CRUD, cursor pagination, nested rounds |
| `/api/v1/analytics` | `routes/analytics.js` | Dashboard stats |
| `/api/v1/documents` | `routes/documents.js` | Vault + assign + ATS fields |
| `/api/v1/hackathons` | `routes/hackathons.js` | Account-backed collaboration |
| `/api/v1/interview-prep` | `routes/interview-prep.js` | Prep workspace |
| `/api/v1/share-links` | `routes/share-links.js` | Authenticated share create/list/revoke |
| `/api/v1/public/share-links` | `routes/public-share-links.js` | Public token/passcode read-only shares |
| `/api/v1/documents/:id/ai-check` | `routes/resume-checker.js` | Gated AI resume-check pipeline |
| `/api/v1/ai-settings` | `routes/ai-settings.js` | Encrypted user AI-provider settings |
| `/api/v1/notifications` | `routes/notifications.js` | Authenticated in-app deadline reminders |
| `/api/v1/internal/jobs/dispatch` | `routes/internal-jobs.js` | Token-protected outbox dispatcher |
| `/api/v1/admin/jobs/dead` | `routes/admin-jobs.js` | Configured-admin dead-letter view |
| `/api/v1/health` | `app.js` | Liveness |
| `/api/v1/health/deps` | `app.js` | Supabase and reminder-outbox readiness |

Round-specific logic also lives in `routes/opportunity-rounds.js` (mounted from opportunities router) and `lib/syncOpportunityFromRounds.js`.

The AI resume check pipeline lives in `lib/resume-agent/` (extract → parse → github → evaluate)
and the provider-agnostic LLM layer in `lib/llm/`. See [`ai-resume-checker.md`](ai-resume-checker.md).

---

## API service objects (`src/services/api.js`)

| Export | Backend prefix |
|--------|----------------|
| `opportunityService` | `/opportunities` |
| `roundService` | `/opportunities/:id/rounds` |
| `documentService` | `/documents` |
| `resumeCheckerService` | `/documents/:id/ai-check` |
| `aiSettingsService` | `/ai-settings` |
| `hackathonService` | `/hackathons/:id/...` |
| `interviewPrepService` | `/interview-prep/:opportunityId` |
| `analyticsService` | `/analytics` |
| `shareLinkService` | `/share-links`, `/public/share-links` |
| `notificationService` | `/notifications` |

Always add new endpoints here — pages should not construct URLs manually.

---

## Feature → doc map

| Feature | Deep-dive doc | Migration SQL |
|---------|---------------|---------------|
| Interview rounds | [`interview-rounds.md`](interview-rounds.md) | `opportunity-rounds-migration.sql` |
| Interview prep | [`interview-prep.md`](interview-prep.md) | `interview-prep-migration.sql` |
| Documents + ATS | [`documents-and-ats.md`](documents-and-ats.md) | `documents-migration.sql` |
| AI Resume Checker (UI gated) | [`ai-resume-checker.md`](ai-resume-checker.md) | `ai-resume-check-migration.sql`, `user-ai-settings-migration.sql` |
| Dashboard share links | [`share-links.md`](share-links.md) | `share-links-migration.sql`, `supabase/migrations/20260624163000_create_share_links.sql`, `supabase/migrations/20260624171000_add_recoverable_share_tokens.sql` |
| Hackathon collaboration | `src/pages/HackathonDetail.jsx` and `src/components/hackathons/` | `hackathon-collaboration-migration.sql`, `20260716081332_idempotent_idea_votes.sql`, `20260716083209_team_memberships_and_invites.sql`, `20260716100000_review_hardening.sql` |
| Deadline reminders | `backend/src/lib/reminderJobs.js`, `.github/workflows/dispatch-reminders.yml` | `20260716082400_transactional_reminder_outbox.sql`, `20260716100000_review_hardening.sql` |
| Architecture & challenges | [`DOCUMENTATION.md`](DOCUMENTATION.md) | `supabase-schema.sql` |
| Testing & CI | [`TESTING.md`](TESTING.md) | — |
| Security | [`SECURITY.md`](SECURITY.md) | — |

---

## Current implementation notes

| Area | Current state |
|----|---------|
| Theme | Light and dark mode are implemented through `ThemeContext` and `ThemeToggle`. |
| AI Resume Checker | Server pipeline and BYOK settings are implemented, but `AI_RESUME_CHECK_ENABLED` is `false`; keep user-facing claims aligned with that flag. |
| Share links | Create, list, revoke, public read, and optional passcode verification are available. |
| API contract | `/api/v1` is canonical; the legacy `/api` mount has a dated deprecation response. Opportunity lists use stable cursor pagination. |
| Collaboration | `team_memberships` authorizes owner/editor/viewer access; name-only roster entries remain display data. Idea votes are unique per account in PostgreSQL. |
| Reminders | The transactional outbox creates in-app deadline notifications. The optional free GitHub Actions trigger is best-effort, so it is not suitable for strict deadlines. |
| Quality gates | CI builds/tests frontend and backend, runs architecture guardrails, and performs informational dependency audits. |

When explaining the project in an interview, lead with **realtime Kanban + RLS challenge**, then **round save latency fix**, then **interview prep** or **ATS scorer** depending on the role.

---

## Local development (minimal)

```bash
# Terminal 1
cd backend && npm run dev    # :3001

# Terminal 2
npm start                    # :3000
```

Env files: `.env` (frontend), `backend/.env` (API). See README **Environment Variables**.

Before a PR:

```bash
npm run test:ci && npm run build
cd backend && npm test && cd ..
npm run check:architecture
```

Full checklist: [`TESTING.md`](TESTING.md).

---

## Where to start for common tasks

| Task | Start here |
|------|------------|
| Fix internship drawer | `OpportunityDetailModal.jsx`, `roundService` |
| Add prep field | `interview-prep-migration.sql` → `interview-prep-schemas.js` → route → panel component |
| New API endpoint | `backend/src/routes/` + test + `api.js` service method |
| UI-only change | `src/components/` or `src/pages/` + smoke test |
| DB column | New `docs/*-migration.sql` + backend validation + frontend types |

---

## External wiki

[Devin Wiki](https://app.devin.ai/wiki/Venkat-Kolasani/FutureStack) — maintained runbook with deployment notes and architecture decisions. Use local `docs/` for offline and version-controlled detail.
