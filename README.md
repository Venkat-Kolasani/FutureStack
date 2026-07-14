# FutureTracker

FutureTracker is a full-stack career-application workspace for students and early-career professionals. It brings internships, hackathons, interview preparation, documents, deadlines, and application insights into one focused workflow.

[Live app](https://futuretracker.online) · [API](https://futurestack-api.onrender.com/api/health) · [Documentation](docs/DOCUMENTATION.md) · [Contributing](CONTRIBUTING.md)

## Project status

The core product is actively implemented and includes opportunity tracking, protected sharing, interview workflows, document management, analytics, and a light/dark theme. The AI Resume Checker pipeline is implemented on the backend, but its frontend entry points are currently disabled behind a feature flag while rollout readiness is completed. See [the project status](docs/PROJECT_STATUS.md) for the authoritative feature matrix.

## What it does

- Track internships and hackathons from saved opportunity to final outcome.
- Manage deadlines in dashboard, calendar, Kanban status board, and PDF reports.
- Record multi-round interview progress and keep the parent opportunity status in sync.
- Prepare for internship interviews with research, questions, technical topics, STAR stories, and reflections.
- Store resumes, cover letters, and external links; associate them with opportunities and receive local ATS-style guidance for PDF and DOCX uploads.
- Collaborate on hackathons with a team workspace, ideas, tasks, votes, and submission checklist.
- Create revocable, optional-passcode, read-only share links without requiring viewers to sign in.
- Explore funnel, deadline, status, and rejection insights.

## Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, React Router 7, Tailwind CSS, Framer Motion, Recharts |
| API | Node.js, Express, Joi validation, Helmet, rate limiting |
| Identity and data | Clerk, Supabase PostgreSQL, Row-Level Security, Supabase Realtime |
| Documents and AI | pdfjs-dist, mammoth, pdf-parse, Vercel AI SDK, Gemini or Ollama |
| Delivery and observability | Vercel, Render, PostHog, GitHub Actions |

## Architecture

```mermaid
flowchart LR
  U["Browser"] --> F["React application"]
  F -->|"Clerk JWT"| A["Express API"]
  A -->|"service-role queries scoped to user"| S[("Supabase PostgreSQL")]
  F -. "Status board subscriptions" .-> R["Supabase Realtime"]
  R -.-> S
  F --> C["Clerk authentication"]
```

The browser uses `src/services/api.js` for application data. Direct Supabase CRUD from the frontend is prohibited; the one exception is a realtime subscription used to refresh the status board. See [the codebase guide](docs/CODEBASE_GUIDE.md) for the request flow and file map.

## Quick start

### Prerequisites

- Node.js 20 or later
- A Clerk application
- A Supabase project

### Install and run

```bash
git clone https://github.com/Venkat-Kolasani/FutureStack.git
cd FutureStack
npm install
(cd backend && npm install)

cp .env.example .env
cp backend/.env.example backend/.env
```

Set the required Clerk and Supabase values in both files, then run the API and client in separate terminals:

```bash
cd backend && npm run dev
```

```bash
npm start
```

The client runs at `http://localhost:3000`; the API runs at `http://localhost:3001`.

## Configuration

The checked-in templates are the complete configuration reference: [`.env.example`](.env.example) and [`backend/.env.example`](backend/.env.example).

| File | Required values |
| --- | --- |
| `.env` | `REACT_APP_CLERK_PUBLISHABLE_KEY`, `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` |
| `backend/.env` | `CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN` |

For production, also set `CLERK_JWT_PUBLIC_KEY` for local JWT verification. Share links need `SHARE_LINK_ENCRYPTION_KEY`. The optional AI pipeline is configured only in `backend/.env` with `RESUME_AI_ENABLED`, provider/model values, and either a server Gemini key or user-managed BYOK settings. Never expose service-role, Clerk secret, or AI keys in frontend variables.

## Database setup

Apply the SQL files in the following order to a new Supabase project:

1. [`docs/supabase-schema.sql`](docs/supabase-schema.sql)
2. [`docs/opportunity-campus-mode-migration.sql`](docs/opportunity-campus-mode-migration.sql)
3. [`docs/documents-migration.sql`](docs/documents-migration.sql)
4. [`docs/opportunity-rounds-migration.sql`](docs/opportunity-rounds-migration.sql) and [`docs/opportunity-rounds-round-types-patch.sql`](docs/opportunity-rounds-round-types-patch.sql)
5. [`docs/interview-prep-migration.sql`](docs/interview-prep-migration.sql)
6. [`docs/hackathon-collaboration-migration.sql`](docs/hackathon-collaboration-migration.sql)
7. [`docs/share-links-migration.sql`](docs/share-links-migration.sql), then the SQL files in [`supabase/migrations`](supabase/migrations)
8. [`docs/ai-tables-setup.sql`](docs/ai-tables-setup.sql) only when enabling the AI Resume Checker

Each migration enables and scopes Row-Level Security policies. Review them before applying in a production project.

## Validation and tests

```bash
npm run test:ci
npm run build
npm run check:architecture
(cd backend && npm test)
```

The architecture check protects the frontend/API boundary. Feature-specific commands and smoke tests are documented in [docs/TESTING.md](docs/TESTING.md).

## API overview

All endpoints except health checks and public-share reads require a Clerk bearer token.

| Area | Prefix |
| --- | --- |
| Health | `/api/health`, `/api/health/deps` |
| Opportunities and interview rounds | `/api/opportunities` |
| Analytics | `/api/analytics` |
| Documents and ATS fields | `/api/documents` |
| Interview preparation | `/api/interview-prep` |
| Hackathon collaboration | `/api/hackathons` |
| Authenticated share links | `/api/share-links` |
| Public share reads | `/api/public/share-links` |
| AI resume checks | `/api/documents/:id/ai-check` |
| AI provider settings | `/api/ai-settings` |

The complete endpoint list, request expectations, and curl examples are in [backend/README.md](backend/README.md).

## Documentation

| Document | Use it for |
| --- | --- |
| [Project status](docs/PROJECT_STATUS.md) | Current shipped, gated, and planned capabilities |
| [Codebase guide](docs/CODEBASE_GUIDE.md) | Routes, service objects, request flow, and contribution orientation |
| [Architecture guide](docs/DOCUMENTATION.md) | System design and deployment model |
| [Testing guide](docs/TESTING.md) | Commands, focused test suites, and manual checks |
| [Security guide](docs/SECURITY.md) | Deployment controls and security assumptions |
| [Interview rounds](docs/interview-rounds.md) | Multi-round pipeline and parent-status synchronization |
| [Interview preparation](docs/interview-prep.md) | Prep workspace data model and API |
| [Documents and ATS](docs/documents-and-ats.md) | Document vault and local ATS scoring |
| [Share links](docs/share-links.md) | Privacy model and public-link verification |
| [AI Resume Checker](docs/ai-resume-checker.md) | Gated pipeline, providers, and rollout requirements |
| [Roadmap](docs/future.md) | Future work and technical priorities |

Historical planning material under `docs/issues/` records the original delivery slices; it is not a statement of the current product state.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before selecting an issue or opening a pull request. Keep contributions focused, add tests for route and validation changes, and do not commit secrets.
