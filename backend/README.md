# FutureTracker Backend API

Express.js backend with Clerk authentication and Supabase PostgreSQL.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your actual keys

# Run development server
npm run dev
```

Server runs at `http://localhost:3001` by default.

## Environment Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `PORT` | Server port (default: 3001) | - |
| `NODE_ENV` | Environment (development/production) | - |
| `CORS_ORIGIN` | Frontend URL for CORS | Your frontend URL |
| `FRONTEND_URL` | Canonical frontend origin used in generated invite links | Your deployed frontend URL |
| `CLERK_SECRET_KEY` | Clerk secret key (starts with `sk_`) | [Clerk Dashboard](https://clerk.com) > API Keys |
| `CLERK_JWT_PUBLIC_KEY` | JWT public key for local verification (recommended for production) | Clerk Dashboard > API Keys > Show JWT Public Key |
| `SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://supabase.com) > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret!) | Supabase Dashboard > Settings > API |
| `SHARE_LINK_ENCRYPTION_KEY` | 32-byte secret used to encrypt recoverable share tokens | Generate locally with `openssl rand -base64 32` |
| `JOB_DISPATCH_TOKEN` | Bearer secret for the reminder dispatcher | Generate locally with `openssl rand -base64 48` |
| `JOB_ADMIN_USER_IDS` | Comma-separated internal user UUIDs allowed to inspect dead jobs | Supabase `users.id` values for internal administrators |
| `RESUME_AI_ENABLED` | Enables or disables AI-check requests | `true` or `false` |
| `LLM_PROVIDER` / `LLM_MODEL` | AI provider and model when the pipeline is enabled | `gemini` or `ollama` |
| `GEMINI_API_KEY` | Server-side Gemini key, when using Gemini | Google AI Studio |
| `AI_KEY_ENCRYPTION_KEY` | Optional dedicated encryption key for user BYOK settings | Generate locally with `openssl rand -base64 32` |

### CLERK_JWT_PUBLIC_KEY (Production)

Setting this variable enables **local JWT verification** without network calls to Clerk's JWKS endpoint. This prevents `TypeError: fetch failed` errors on Render.

**Accepted formats:** multi-line PEM or single-line with `\n` escapes (middleware normalizes both).

## API Endpoints

All paths below are canonical `/api/v1` endpoints. The legacy `/api` prefix remains temporarily available with `Deprecation` and `Sunset` headers for existing clients.

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Liveness check |
| GET | `/api/v1/health/deps` | Supabase, AI-table, and reminder-outbox readiness (returns 503 if degraded) |

### Auth & user

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/me` | Current user (`userId`, `internalUserId`, `email`) |

### Opportunities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/opportunities` | Paginated list for user |
| GET | `/api/v1/opportunities/:id` | Single opportunity |
| POST | `/api/v1/opportunities` | Create |
| PUT/PATCH | `/api/v1/opportunities/:id` | Update |
| DELETE | `/api/v1/opportunities/:id` | Delete |

`GET /api/v1/opportunities` accepts `limit` (1–100), optional `status`/`category`, and opaque `cursor`; it returns `{ items, nextCursor }` sorted by `(created_at DESC, id DESC)`.

### Interview rounds (internships)

Nested under opportunities. See [`../docs/interview-rounds.md`](../docs/interview-rounds.md).

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v1/opportunities/:id/rounds` | Ordered by `round_number` |
| POST | `/api/v1/opportunities/:id/rounds` | Returns `{ round, opportunity, rounds }` |
| PATCH | `/api/v1/opportunities/:id/rounds/:roundId` | Syncs parent status |
| DELETE | `/api/v1/opportunities/:id/rounds/:roundId` | Re-syncs after delete |

### Interview prep (internships)

See [`../docs/interview-prep.md`](../docs/interview-prep.md). Requires `docs/interview-prep-migration.sql`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/interview-prep/:opportunityId` | Full graph: prep + questions + topics + behavioral |
| POST | `/api/v1/interview-prep/:opportunityId` | Create prep record |
| PUT | `/api/v1/interview-prep/:opportunityId` | Update research / reflection |
| POST/PUT/DELETE | `/api/v1/interview-prep/:opportunityId/questions/...` | Question bank |
| POST/PUT/DELETE | `/api/v1/interview-prep/:opportunityId/topics/...` | Technical topics |
| POST/PUT/DELETE | `/api/v1/interview-prep/:opportunityId/behavioral/...` | STAR entries |

### Documents

See [`../docs/documents-and-ats.md`](../docs/documents-and-ats.md).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/documents` | List user documents |
| GET | `/api/v1/documents/:id` | Single document |
| GET | `/api/v1/documents/by-opportunity/:opportunityId` | Linked to opportunity |
| POST | `/api/v1/documents` | Create (metadata / URL) |
| POST | `/api/v1/documents/upload` | Multipart file upload |
| PATCH | `/api/v1/documents/:id` | Update (incl. `ats_score`, `ats_analysis`) |
| DELETE | `/api/v1/documents/:id` | Delete |
| POST | `/api/v1/documents/:id/assign` | Link to opportunity |
| DELETE | `/api/v1/documents/:id/unassign/:opportunityId` | Unlink |

### AI Resume Checker and provider settings

See [`../docs/ai-resume-checker.md`](../docs/ai-resume-checker.md).
Rate-limited on **POST** only (see `middleware/aiLimiter.js`). GET is unlimited.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/documents/:id/ai-check` | Run AI resume check pipeline |
| GET  | `/api/v1/documents/:id/ai-check` | Fetch latest AI check result |

Requires `GEMINI_API_KEY` (or `LLM_PROVIDER=ollama`). Set `RESUME_AI_ENABLED=false` to reject analysis requests. The frontend currently keeps its AI controls behind a separate feature flag; see [`../docs/PROJECT_STATUS.md`](../docs/PROJECT_STATUS.md).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/ai-settings` | Read the authenticated user's safe provider-setting metadata |
| PUT | `/api/v1/ai-settings` | Save encrypted user-managed provider settings |
| DELETE | `/api/v1/ai-settings` | Remove user-managed settings |

### Share links

Authenticated owners manage links through `/api/v1/share-links`; viewers use the public routes without a Clerk session.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/share-links` | List the current user's share metadata |
| POST | `/api/v1/share-links` | Create a read-only, optional-passcode share |
| DELETE | `/api/v1/share-links/:id` | Revoke a share |
| GET | `/api/v1/public/share-links/:token` | Read public snapshot or passcode-required state |
| POST | `/api/v1/public/share-links/:token/verify` | Verify passcode and read snapshot |

### Hackathons

Team collaboration workspace. Its UI lives in `src/pages/HackathonDetail.jsx` and `src/components/hackathons/`; apply [`../docs/hackathon-collaboration-migration.sql`](../docs/hackathon-collaboration-migration.sql) before using it against a new database.

Apply the July 16 migrations through `20260716100000_review_hardening.sql` in timestamp order after the base collaboration schema before deploying these routes. The membership migration backfills team owners, stores only hashed invite tokens, and makes the API role checks effective; the hardening migration preserves owner roles during invite redemption and adds the final vote-count invariant.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT | `/api/v1/hackathons/:id/team` | Team CRUD |
| POST/PUT/DELETE | `/api/v1/hackathons/:id/team/members` | Members |
| POST | `/api/v1/hackathons/:id/invites` | Owner creates an expiring, single-use account invite |
| POST | `/api/v1/hackathons/invites/:token/accept` | Authenticated user accepts an invite |
| GET/POST/PUT/DELETE | `/api/v1/hackathons/:id/ideas` | Brainstorming + vote |
| GET/POST/PUT/DELETE | `/api/v1/hackathons/:id/tasks` | Task board |
| GET/POST/PUT/DELETE | `/api/v1/hackathons/:id/checklist` | Submission checklist |

Owners manage the team, roster, and invites; editors may change workspace content; viewers may read it and vote. The name-only roster is not an authorization source.

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics` | Dashboard stats and chart data |

### Notifications and background jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | List the authenticated user's in-app reminders |
| PATCH | `/api/v1/notifications/:id/read` | Mark one notification as read |
| POST | `/api/v1/internal/jobs/dispatch` | Token-protected reminder dispatcher for GitHub Actions |
| GET | `/api/v1/admin/jobs/dead` | Configured-admin visibility into dead-letter jobs |

The dispatcher requires `JOB_DISPATCH_TOKEN`. Dead-job visibility requires `JOB_ADMIN_USER_IDS` (comma-separated internal user UUIDs). Apply the July 16 migrations through `20260716100000_review_hardening.sql` before enabling either feature.

## Testing

```bash
npm test                    # All backend tests
npm test -- interview-prep  # Interview prep integration tests
npm test -- rounds          # Interview rounds tests
npm test -- validation      # Schema validation tests
```

No real Clerk or Supabase credentials needed — tests use mocks.

## Testing with cURL

```bash
# Health check (no auth)
curl http://localhost:3001/api/v1/health

# Dependency check
curl http://localhost:3001/api/v1/health/deps

# Get opportunities (requires token)
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  http://localhost:3001/api/v1/opportunities

# Get interview prep for an internship
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  http://localhost:3001/api/v1/interview-prep/OPPORTUNITY_UUID
```

## Deploy to Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. Set **Build Command** to `npm install`
5. Set **Start Command** to `npm start`
6. Add environment variables in Render dashboard
7. Set `CORS_ORIGIN` to your production frontend URL

## Project Structure

```
backend/
├── src/
│   ├── server.js              # HTTP listener
│   ├── app.js                 # Express app, rate limits, mounts
│   ├── lib/
│   │   ├── supabase.js        # Supabase admin client
│   │   ├── syncOpportunityFromRounds.js
│   │   ├── llm/               # Provider-agnostic LLM layer (AI Resume Checker)
│   │   │   └── index.js       #   generateText / generateObject / getProviderInfo
│   │   └── resume-agent/      # Agentic AI resume check pipeline
│   │       ├── extract.js     #   PDF/DOCX text extraction from Supabase Storage
│   │       ├── parser.js      #   LLM → JSON Resume (per-section extraction)
│   │       ├── github.js      #   GitHub API enrichment + LLM project selection
│   │       ├── evaluator.js   #   LLM → category scores + evidence
│   │       ├── runResumeCheck.js  #   Pipeline orchestrator
│   │       └── prompts/       #   JS prompt templates (from hiring-agent Jinja, MIT)
│   │           └── index.js
│   ├── middleware/
│   │   ├── auth.js            # Clerk JWT verification
│   │   └── validate.js        # Request validation
│   ├── routes/
│   │   ├── opportunities.js
│   │   ├── opportunity-rounds.js
│   │   ├── interview-prep.js
│   │   ├── documents.js
│   │   ├── resume-checker.js  # AI resume check routes
│   │   ├── ai-settings.js     # Encrypted user-provider settings
│   │   ├── share-links.js     # Authenticated share management
│   │   ├── public-share-links.js
│   │   ├── hackathons.js
│   │   └── analytics.js
│   └── validation/            # Schemas per route module
├── tests/
│   ├── integration/
│   └── unit/
├── .env.example
└── package.json
```

**Frontend integration:** all calls go through `src/services/api.js` — see [`../docs/CODEBASE_GUIDE.md`](../docs/CODEBASE_GUIDE.md).
