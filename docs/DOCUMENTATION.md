# FutureTracker: Interview Preparation Guide

Last reviewed against the repository: July 30, 2026

This is the single, interview-focused source of truth for FutureTracker. It explains what the product does, how the current implementation works, why the important choices were made, the trade-offs they create, and how the design would evolve for millions of users. It is deliberately candid: a strong interview answer distinguishes shipped behavior from a production-scale plan.

## 1. The 60-second answer

**FutureTracker is a full-stack career-application workspace for students and early-career professionals.** It lets a user manage internships and hackathons, capture a listing from the current browser tab with a Chrome extension, track deadlines on a calendar and Kanban board, record multi-round interviews, prepare for interviews, manage application documents, view analytics, collaborate on hackathons, and selectively share a read-only progress snapshot.

The application is a React single-page app backed by an Express API. Clerk handles identity; the API validates Clerk JWTs and enforces user ownership; Supabase provides PostgreSQL, storage, and limited realtime refreshes. I chose an API boundary rather than frontend database CRUD so authentication, validation, business rules, and sensitive operations are centralized. The design is intentionally modular: each domain has a route module, validation schemas, focused UI components, migration SQL, and tests.

The most important engineering trade-offs are:

- Supabase and Clerk made it possible to ship safely and quickly without building identity or database infrastructure from scratch.
- Express gives direct control over validation and authorization, but the current single-process API and in-memory user cache are not sufficient for horizontal scale.
- The status board uses realtime notifications followed by an API refetch. That is simple and correct for the current scale, but should become filtered broadcast events or a server-mediated event stream before broad production rollout.
- The AI Resume Checker is implemented but UI-gated. This avoids silently taking on LLM cost, privacy, latency, and reliability risks before its rollout controls are complete.

## 2. Product problem and user journey

### Problem

Career applications are fragmented across job boards, messages, spreadsheets, documents, deadlines, and interview notes. A student managing many applications needs one private workspace that answers:

- What have I applied to, and what needs action next?
- Which resume or cover letter did I submit?
- Where am I in each interview pipeline?
- How is my application funnel changing over time?
- How can I safely share progress with a mentor without exposing my account?

### Primary user flow

1. A user signs in with Clerk.
2. They can add an internship or hackathon directly, or use the Chrome MV3 extension to prefill title, description, and link from the active tab before saving.
3. The dashboard, calendar, list, and Kanban board present the same opportunity data in different task-oriented views.
4. For an internship, the user can add interview rounds and preparation material. Round outcomes synchronize the parent opportunity status.
5. The user uploads or links a resume/cover letter, receives client-side ATS-style feedback for supported files, and assigns documents to applications.
6. For a hackathon, the user maintains team members, brainstormed ideas, tasks, and a submission checklist.
7. The user can generate an expiring, revocable, optionally passcode-protected read-only snapshot for a mentor or recruiter.

### Current feature status

| Capability | Current state | Important interview detail |
| --- | --- | --- |
| Opportunity CRUD, dashboard, calendar, reports, analytics | Available in the current release | Internships support `campus_mode` (on/off campus) in the API and UI filters. The active-events migration uses `applied_on` for internships and reserves active `deadline` behavior for hackathon submissions; all mutations go through the Express API. |
| Chrome MV3 opportunity saver | Implemented, configuration-gated | The popup injects metadata extraction only when opened, lets users review fields (including campus mode), obtains a Clerk token through the extension sync host, and posts through the supported legacy `POST /api/opportunities` compatibility mount. Manual loading plus Clerk allowed-origin and CORS configuration remain deployment steps. |
| Light and dark theme | Available | Theme preference is managed in React context and applied to Clerk appearance as well as app UI. |
| Interview rounds and preparation | Available | Rounds are internship-only, synchronize derived parent fields server-side, and can hold an optional scheduled date/time. |
| Documents and ATS hints | Available | ATS analysis is rule-based and runs in the browser; it is not an official ATS score. |
| Hackathon collaboration | Implemented, migration-gated | Account-backed owner/editor/viewer memberships authorize workspaces; the name-only roster is display data. Idea votes are database-idempotent. |
| Read-only share links | Available | A stored snapshot is shared, not live dashboard access. Links can expire, be revoked, and require a passcode. |
| AI Resume Checker | Implemented, UI-gated | Backend pipeline, storage, provider settings, tests, and UI components exist; `AI_RESUME_CHECK_ENABLED` is currently `false`. |
| Hackathon submission reminders | Available, scheduler-configured | The outbox and leased dispatcher create durable in-app notifications. GitHub Actions is an optional best-effort free-tier scheduler; the active-events migration limits new reminder intent to hackathon submissions. |
| Website notification center and optional Resend email reminders | Implemented, migration/config-gated | The bell page shows persisted website notifications and lets each user opt into email copies. A per-job delivery record and Resend idempotency key make retried sends safe. |
| Tags, bulk import/export, advanced filters, Progress Logger | Planned | These are intentionally not claimed as shipped features. Progress Logger tables exist in migration SQL only. |

**Production rollout status (checked July 30, 2026):** Active-events, notification-preference, and optional-email migrations live in `supabase/migrations/` and are applied to the maintainer's Supabase project. Matching API and frontend behavior is on the main branch. Deploy API and web together whenever a database gains new columns or triggers. Optional Resend email remains off until backend env vars and the user's Notifications opt-in are both set.

### Active-events verification (post-migration)

1. Completed: apply [`20260716110000_rounds_drive_active_events.sql`](../supabase/migrations/20260716110000_rounds_drive_active_events.sql).
2. Completed: run `node scripts/verify-rounds-schema.js` from the repository root with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `backend/.env`. The verifier is read-only.
3. After deploy: add an internship with **Applied on**, schedule a dated/time round, and confirm the dashboard/calendar show that round while a hackathon submission still appears as a deadline.

## 3. System architecture

```mermaid
flowchart LR
  U["User browser"] --> R["React SPA"]
  U --> X["Chrome MV3 extension"]
  R -->|"Clerk session"| C["Clerk"]
  R -->|"Bearer JWT over HTTPS"| A["Express API /api/v1 + legacy /api"]
  X -->|"Clerk JWT"| A
  A -->|"verify JWT and resolve internal user"| C
  A -->|"user-scoped service-role queries"| DB[("Supabase PostgreSQL")]
  R -. "current status-board refresh events" .-> RT["Supabase Realtime"]
  RT -.-> DB
  A --> ST["Supabase Storage"]
  A -. "gated only" .-> LLM["Gemini or Ollama"]
  G["GitHub Actions\nbest-effort / 15 min"] -->|"token-protected dispatch"| A
  A --> J[("Postgres reminder\noutbox + website notifications")]
  R -->|"bell page: list/read and preference"| A
  A -. "optional, config-gated" .-> E["Resend email API"]
```

### Why this architecture?

| Choice | Why it was chosen | Trade-off |
| --- | --- | --- |
| React single-page application | Fast, responsive interaction for a personal workspace; components naturally map to product domains. | Initial JavaScript cost and client state complexity; authenticated routes are lazy-loaded to reduce initial work. |
| Express API | Centralizes authorization, validation, ownership checks, audit-oriented logging, rate limits, and business rules. | Requires separate API deployment and operational ownership. |
| Clerk | Avoids building credential storage, OAuth, sessions, and token issuance. | Adds vendor dependency and requires correct JWT-key configuration. |
| Supabase PostgreSQL | Provides managed relational data, storage, RLS, migrations, and realtime primitives. | Service-role use must be tightly controlled; schema and RLS changes are security-sensitive. |
| REST over a separate API | Clear resources and predictable debugging for CRUD-oriented domains. | Some multi-resource screens require several endpoints; a BFF aggregation layer may be useful later. |
| Versioned API prefix | `/api/v1` permits additive and breaking contract evolution without silently breaking existing clients. | A temporary legacy mount adds code paths and must be retired on its advertised sunset date. |
| Transactional outbox | The outbox couples hackathon submission reminder intent to an opportunity write and dispatches it asynchronously with leases and retries. It always writes an in-app notification and can add a Resend email channel with a per-job delivery record. | GitHub Actions and the Resend free tier have limits; this is acceptable for personal deadline reminders, not strict-timing or safety-critical work. |
| Vercel AI SDK with Gemini/Ollama | Provider abstraction permits a hosted or local model option. | LLM calls are slow, variable, and costly, so the feature is gated. |

### Deployment shape today

- Frontend: React app intended for Vercel.
- Chrome extension: a separately built MV3 bundle, loaded from `extensions/dist`; it uses Clerk's extension session sync and the same authenticated API boundary after its allowed origin and CORS entry are configured.
- API: Express service on Render at `https://futurestack-aeyn.onrender.com/api/v1`; liveness is `/health` and dependency readiness is `/health/deps`.
- Identity: Clerk.
- Database, storage, and optional realtime: Supabase.
- Product analytics: PostHog when configured.
- CI: GitHub Actions runs frontend build/tests, backend tests, architecture guardrails, and non-blocking dependency audits.
- Reminder scheduling: an optional repository workflow posts to the token-protected dispatcher every 15 minutes. It is intentionally described as best-effort because the GitHub Actions free tier has no execution SLA.
- Email delivery: an optional Resend API call runs only inside the leased dispatcher. It is server-only, never blocks opportunity create/update requests, and is selected per user from the website notification page.

The exact environment contract lives in `.env.example`, `backend/.env.example`, and `extensions/.env.example`. Vercel must receive `REACT_APP_API_URL=https://futurestack-aeyn.onrender.com/api/v1` at build time. Secrets are backend-only; the browser and extension receive only public configuration such as Clerk's publishable key and Supabase's anon key.

## 4. Frontend architecture

### Application composition

`src/App.js` is the composition root. It wires up:

- `HelmetProvider` for document metadata.
- `ThemeProvider` for persisted light/dark preference.
- `ClerkProvider`, including matching Clerk appearance tokens.
- `ErrorBoundary` for unexpected render failures.
- React Router routes and `ProtectedRoute` wrappers.
- A global toast container and page-view tracking.
- `Suspense` and route-level lazy loading for authenticated pages.

The landing page loads immediately; heavier authenticated pages such as Dashboard, Analytics, Documents, and Hackathon Detail are loaded on demand. This was a deliberate performance choice because the landing route is the most common first visit.

### Public discoverability (SEO / AI agents)

The authenticated app remains a client-rendered SPA. Crawlable marketing content lives as static files under `public/` so search engines and AI agents can read real HTML without executing the bundle:

- `public/llms.txt` — short curated product index for AI agents (cite as FutureTracker.online).
- `public/llms-full.txt` — longer feature, architecture, and citation brief for agents that fetch it.
- `public/about.html`, `public/privacy.html`, and `public/guides/*.html` — indexable trust and intent pages.
- `public/sitemap.xml` and `public/robots.txt` list those URLs; agent crawlers are allowed.
- Brand copy and JSON-LD disambiguate from the unrelated ESG product at futuretracker.com.
- Authenticated app routes stay `noindex` via `src/components/seo/SEO.jsx`.

After deploy, submit the sitemap in Google Search Console and Bing Webmaster Tools. Third-party citations (directories, Product Hunt, student communities) remain the main lever for AI recommendations.

### Data access rule

`src/services/api.js` is the frontend's application-data boundary. It creates Axios clients, attaches a Clerk bearer token to protected requests, maps common HTTP errors to user-facing messages, and exports service objects such as `opportunityService`, `documentService`, `roundService`, and `shareLinkService`.

**Why not query Supabase directly from every component?** It would distribute authorization logic and make validation, rate limiting, audit logging, and future backend changes much harder to enforce consistently. The repository's architecture check guards against direct frontend Supabase CRUD.

### State and UI decisions

- Local component state and hooks are sufficient for the current app; there is no global Redux-like store because most data is page/domain scoped.
- `useAuthToken` registers a token getter once so the API client obtains fresh Clerk JWTs rather than storing a raw token in browser state.
- `ThemeContext` owns the theme preference; individual components consume a boolean instead of duplicating persistence logic.
- Shared components standardize cards, buttons, modals, loading, empty states, error handling, navigation, and status indicators.
- `react-toastify` provides consistent asynchronous feedback; the Axios response interceptor maps network, auth, validation, availability, and server failures to useful messages.

### Current realtime behavior and honest limitation

The Status Board subscribes to Supabase `postgres_changes` for the `opportunities` table. On any event it refetches the user's opportunities through the API. That avoids trying to merge database event payloads into client state and makes the API the source of rendered truth.

This is acceptable for a small product but is not the final production design:

- The subscription is broad rather than explicitly filtered by user in the client code.
- Refetching the whole list per event does not scale with high write volume or large portfolios.
- Realtime authorization and database publication policies must be reviewed together; changing RLS or delivery settings can break the current approach.

For scale, I would publish a small, user-scoped event from the API after a committed mutation, use Supabase Broadcast or a dedicated websocket service, include an entity/version in the payload, and update or invalidate only the affected query. That preserves isolation and reduces needless reads.

## 5. Backend request lifecycle

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Express API
  participant C as Clerk JWT key
  participant S as Supabase

  B->>A: Request with Bearer token
  A->>A: Helmet, CORS, body limit, sanitization, rate limit
  A->>C: Verify RS256 JWT locally
  A->>S: Resolve or create internal user row
  A->>A: Validate request payload and apply domain rule
  A->>S: Query scoped by internal user ID
  S-->>A: Data or database error
  A-->>B: JSON success or classified error
```

### Middleware order and responsibility

`backend/src/app.js` configures:

1. `trust proxy` for reverse-proxy-aware request data.
2. Helmet headers, including CSP, HSTS, frame protection, `nosniff`, and a referrer policy.
3. CORS using a comma-separated allowlist from `CORS_ORIGIN`.
4. A 1 MB JSON body limit and input sanitization.
5. Read rate limiting: 100 GET requests per minute per authenticated internal user, with an IP fallback before authentication.
6. Write rate limiting: 20 mutating requests per minute per authenticated internal user, with an IP fallback before authentication.
7. JSON request/response logging with an `X-Request-Id` correlation identifier.
8. Public health routes, protected route mounts, a 404 handler, and centralized error fallback.

The limits protect a free-tier personal-productivity service from accidental loops and basic abuse. They are process-local, not a complete DDoS or multi-region rate-limiting solution.

### API versioning and pagination

`/api/v1` is the canonical public contract. The old `/api` mount remains only as a transition path and responds with `Deprecation`, `Sunset`, and `Link: rel="successor-version"` headers. This lets a client migrate deliberately instead of discovering a breaking change at runtime. The versioning decision and retirement condition are recorded in [ADR-001](adr/ADR-001-versioned-api.md).

Opportunity lists use cursor pagination rather than `OFFSET`: results are sorted by `(created_at DESC, id DESC)`, a cursor encodes the last row, and the API reads `limit + 1` rows to determine `nextCursor`. That ordering stays stable while new opportunities are inserted and avoids walking an ever-larger offset. The matching composite index must be justified with a realistic `EXPLAIN (ANALYZE, BUFFERS)` benchmark before claiming a performance gain; see [ADR-002](adr/ADR-002-pagination-and-indexes.md).

### Authentication and internal identity

`backend/src/middleware/auth.js`:

- Extracts the `Authorization: Bearer <token>` header.
- Verifies the token locally with the Clerk RS256 public key from `CLERK_JWT_PUBLIC_KEY`.
- Uses the token subject as the external Clerk identity.
- Resolves that subject to an internal `users.id` UUID in Supabase, creating the row on first login.
- Stores that UUID on `req.auth.internalUserId`; protected handlers use it for ownership scoping.

**Why both Clerk ID and internal UUID?** Clerk remains the identity provider, while a stable internal UUID makes relational foreign keys and database ownership simple. The API never trusts a user ID supplied by the client.

**First-login race condition:** concurrent first requests can both try to insert a user row. The code handles PostgreSQL's unique-constraint error by reading the row that won the race.

**Current trade-off:** internal-user lookups are cached in a process-local `Map` for five minutes. This saves database lookups on one instance, but the cache disappears on restart and is not shared across instances. At scale I would use a shared cache such as Redis or remove the lookup from the hot path through a reliable identity-provisioning/webhook design.

### Validation and error semantics

Route request schemas live under `backend/src/validation/` and are applied through `middleware/validate.js`. Validation is done before database mutation. The API uses meaningful classes of response:

| Status | Meaning in this project |
| --- | --- |
| 401 | Missing, invalid, or expired bearer token |
| 403 | Caller is authenticated but cannot access the resource |
| 404 | Route or scoped resource does not exist |
| 422 | Request data fails validation |
| 429 | General, write, public-share, or AI limit reached |
| 500 | Unexpected application error |
| 503 | A dependency/auth bootstrap is unavailable or health checks are degraded |

The browser treats these differently so an outage is not misleadingly shown as a session-expiry problem.

## 6. Data model and ownership

### Core relational model

```mermaid
erDiagram
  USERS ||--o{ OPPORTUNITIES : owns
  USERS ||--o{ DOCUMENTS : owns
  USERS ||--o{ SHARE_LINKS : creates
  USERS ||--o{ PROGRESS_TRACKS : owns
  USERS ||--o| USER_AI_SETTINGS : configures
  OPPORTUNITIES ||--o{ OPPORTUNITY_ROUNDS : contains
  OPPORTUNITIES ||--o{ OPPORTUNITY_DOCUMENTS : uses
  DOCUMENTS ||--o{ OPPORTUNITY_DOCUMENTS : attached_to
  OPPORTUNITIES ||--o| INTERVIEW_PREP : has
  INTERVIEW_PREP ||--o{ INTERVIEW_QUESTIONS : contains
  INTERVIEW_PREP ||--o{ TECHNICAL_TOPICS : contains
  INTERVIEW_PREP ||--o{ BEHAVIORAL_PREP : contains
  OPPORTUNITIES ||--o| HACKATHON_TEAMS : has
  HACKATHON_TEAMS ||--o{ TEAM_MEMBERS : has
  HACKATHON_TEAMS ||--o{ TEAM_MEMBERSHIPS : authorizes
  USERS ||--o{ TEAM_MEMBERSHIPS : receives_role
  HACKATHON_TEAMS ||--o{ TEAM_INVITES : issues
  HACKATHON_TEAMS ||--o{ BRAINSTORM_IDEAS : has
  BRAINSTORM_IDEAS ||--o{ IDEA_VOTES : receives
  USERS ||--o{ IDEA_VOTES : casts
  HACKATHON_TEAMS ||--o{ HACKATHON_TASKS : has
  HACKATHON_TEAMS ||--o{ SUBMISSION_CHECKLIST : has
  OPPORTUNITIES ||--o{ NOTIFICATION_JOBS : queues
  USERS ||--o{ USER_NOTIFICATIONS : receives
  DOCUMENTS ||--o{ RESUME_AI_CHECKS : produces
  PROGRESS_TRACKS ||--o{ PROGRESS_LOGS : records
```

**How to draw this in an interview:** start with `Users → Opportunities` as the centre. Add the many-to-many document relationship using `opportunity_documents`; that demonstrates normalization. Then branch to interview rounds/prep for internships and a one-to-one hackathon team for hackathons. Add share links as a user-owned snapshot, not a relationship from a public viewer to private data. Do not try to draw every column unless asked.

### Important tables

| Table/group | Purpose | Design reason |
| --- | --- | --- |
| `users` | Maps Clerk subject to internal UUID and profile data. | Separates external identity from relational ownership. |
| `opportunities` | Core internship/hackathon record, status, notes, campus mode, and derived round fields. After the active-events migration, it also includes `applied_on` and reserves `deadline` for hackathon submissions. | One canonical entity serves every product view without treating a completed job application as a future deadline. |
| `opportunity_rounds` | Ordered interview stages and results. After the active-events migration, rounds also include scheduled date/time and become the active-event source for internships. | A normalized child collection avoids hard-coding a fixed number of interview columns. |
| `documents` and `opportunity_documents` | User documents and many-to-many assignments. | A document can be reused across applications. |
| Interview-prep tables | Research, question bank, technical topics, and behavioral STAR records. | Structured prep data is easier to extend and query than one unbounded blob. |
| Hackathon collaboration tables | Team, display roster, account memberships, hashed invites, ideas, votes, tasks, and checklist items. | `team_memberships` is the authorization source; the roster remains flexible display data. A `(idea_id, user_id)` primary key prevents duplicate votes under concurrency. |
| `notification_jobs`, `user_notifications` | Deadline-reminder intent, lease/retry state, and user-visible in-app notifications. | A transactionally created job is durable, idempotent, and retryable without making an opportunity write wait for background work. |
| `share_links` | Snapshot metadata, hashed token, encrypted recoverable token, passcode data, expiry, status, and views. | Sharing is isolated from live dashboard authorization. |
| `resume_ai_checks`, `user_ai_settings` | Persisted AI result and encrypted per-user settings. | AI runs can be shown later without repeating paid work. |
| `progress_tracks`, `progress_logs` | User-owned learning tracks and one daily log per track, with flexible track-specific JSON metadata. | The normalized track/log relationship supports history and yearly heatmaps without a table per learning template. |

### Why PostgreSQL and migrations?

The product has clear relationships, ownership boundaries, constraints, and reporting needs. PostgreSQL fits this better than an unstructured document store. SQL migrations under `docs/` and `supabase/migrations/` record schema evolution, indexes, RLS policies, and triggers. They must be reviewed like application code because an incorrect policy can expose data.

### Row-Level Security and service role

RLS is enabled on user-owned tables as defense in depth. In the current server-side design, the API uses a Supabase service-role client, which bypasses RLS. Therefore the primary runtime protection is explicit user scoping in each API query, with RLS protecting against accidental direct database access and future client paths.

The correct interview answer is not “RLS alone secures everything.” It is: **the API derives identity from a verified JWT, scopes every service-role query to that identity, and RLS is a second layer that must be tested and reviewed with each migration.**

### DBMS concepts to name confidently

| Concept | How FutureTracker uses it | Interview-ready explanation |
| --- | --- | --- |
| Normalization | Documents are separate from opportunities; `opportunity_documents` is a junction table. Interview rounds are child rows rather than `round_1`, `round_2`, and so on. | This avoids repeated data, supports reuse, and allows an unbounded number of rounds/documents without schema changes. |
| 1NF, 2NF, 3NF | Columns are atomic; many-to-many data is split into a junction table; child data depends on its own primary key and parent FK rather than unrelated fields. | The aim was practical third-normal-form design, not normalization for its own sake. I denormalize only derived fields that improve the product flow. |
| Primary/foreign keys | UUID primary keys; foreign keys tie every owned row to a user, opportunity, document, prep record, or team. | FKs make relationships explicit and prevent orphaned records. |
| Cascading deletes | Child resources use `ON DELETE CASCADE` where their parent owns their lifecycle. | Deleting an opportunity should not leave rounds, prep, or document links that no longer have a meaning. |
| Constraints | `CHECK` constraints limit categories, statuses, and campus modes; `UNIQUE` prevents duplicate Clerk identities, document links, and one-to-one prep/team records. | Important invariants live in the database as well as API validation. |
| Indexes | The core schema indexes Clerk IDs, user IDs, category, status, and deadlines. | Indexes are selected for known ownership/filter patterns; at scale I would add measured composite indexes beginning with `user_id`. |
| ACID and transactions | PostgreSQL provides transactional primitives, but not every current multi-step route is wrapped in an explicit application transaction. | For a production multi-write workflow—for example a round mutation plus parent sync—I would use an explicit transaction or database function so partial success cannot leave inconsistent state. |
| Isolation | User-scoped queries and database constraints prevent most logical conflicts; first-login creation explicitly handles a unique-key race. | For concurrent updates to the same resource, I would add optimistic versioning or transaction locking only when real conflict patterns justify it. |
| RLS | Policies limit direct row access as defence in depth. | Service-role access bypasses RLS, so verified API ownership checks remain essential. |

## 6.1 Interview diagram pack

If an interviewer asks you to draw, use one of these three diagrams. State the scope before drawing: “I’ll draw the current implementation first, then mark what I would change for scale.”

### A. High-level architecture

Use the architecture diagram in [System architecture](#3-system-architecture). Draw five boxes in this order: Browser/React → Express API → Clerk and Supabase; then add Storage and the gated AI provider as external dependencies. Label the API connection “HTTPS + bearer JWT” and the database connection “user-scoped server query.”

### B. Request sequence

Use this compact write path when asked how a mutation is secured:

```mermaid
sequenceDiagram
  participant UI as React page
  participant API as Express route
  participant Auth as Auth middleware
  participant DB as Supabase/PostgreSQL

  UI->>API: PATCH /opportunities/:id + Bearer JWT
  API->>Auth: verify RS256 JWT and resolve internal user ID
  Auth-->>API: req.auth.internalUserId
  API->>API: validate payload and domain rules
  API->>DB: UPDATE ... WHERE id = ? AND user_id = ?
  DB-->>API: updated row
  API-->>UI: JSON response
```

The important line to say aloud is the database predicate: authorization is enforced at the data access point, not only in the UI.

### C. ER diagram

Use the ER diagram above. Explain cardinality: a user has many opportunities; an opportunity has many rounds; documents and opportunities are many-to-many; one opportunity has at most one prep workspace or hackathon team; a team has many members/tasks/ideas/checklist items.

## 6.2 OOP and frontend design concepts

FutureTracker is written in JavaScript/React and deliberately favors **functional components and composition** over a class-heavy inheritance hierarchy. That is an informed OOP answer, not an absence of design.

| OOP concept | Where it appears | How to explain it |
| --- | --- | --- |
| Encapsulation | `opportunityService`, `shareLinkService`, auth middleware, `syncOpportunityFromRounds`, and reusable UI components hide implementation details behind narrow interfaces. | A page asks a service to update an opportunity; it does not know Axios headers, token handling, or route construction. |
| Abstraction | A `DocumentCard`, `Modal`, or API service exposes the behaviour a caller needs without exposing internal rendering/network details. | Abstractions reduce coupling and make implementation changes local. |
| Composition | Pages compose domain-specific panels and common components; a hackathon is an opportunity plus specialized collaboration resources. | Composition is more flexible than deep inheritance and maps naturally to React. |
| Polymorphism through props | Shared buttons, cards, modals, and status components change behaviour/style through props. | The caller uses the same component contract with different data or variants. |
| Separation of concerns | Routes own HTTP/domain orchestration, validation owns input shape, library helpers own pure rules, and components own rendering/interactions. | This gives each unit a reason to change and makes testing focused. |
| Inheritance, intentionally limited | Modern React does not require class inheritance for reuse. | I prefer composition because it avoids fragile base classes and makes domain boundaries explicit. |

Useful example: `syncOpportunityFromRounds` is effectively a pure domain-rule module. It receives rounds and existing status and returns derived fields. That makes it easy to unit test without React, HTTP, or the database.

## 6.3 Networking and computer-network concepts

| Concept | Current use | Nuanced interview answer |
| --- | --- | --- |
| Client-server model | React runs in the browser; Express exposes JSON APIs. | The client owns presentation and interaction; the server is the policy and data-access boundary. |
| HTTPS/TLS | Production hosting platforms terminate TLS for frontend/API endpoints. | TLS protects data in transit; it does not replace authorization or data isolation. |
| HTTP and REST | Resource-oriented URLs use `GET`, `POST`, `PATCH`/`PUT`, and `DELETE`. | `GET` is safe/read-only; clients can retry it more freely. Mutations require careful retry/idempotency design, especially for future queues/payments-like flows. |
| JWT bearer authentication | The browser obtains a Clerk token and sends it in `Authorization`; Express verifies RS256 locally. | A JWT proves a signed identity claim but must be verified for signature/expiry and never treated as a database authorization query by itself. |
| CORS | Express restricts browser origins through `CORS_ORIGIN`. | CORS is a browser-enforced cross-origin policy, not an authentication mechanism or server-to-server security control. |
| Reverse proxy | Express enables `trust proxy` because hosting sits behind a proxy. | This allows correct client/protocol interpretation; it must only trust known proxy infrastructure to avoid spoofed forwarding headers. |
| DNS/CDN | Vercel can serve frontend assets close to users; Render/Supabase/Clerk are managed external endpoints. | CDN helps static content latency; API and database performance still need independent capacity planning. |
| WebSocket/realtime | The status board currently subscribes to Supabase realtime then refetches through the API. | Realtime is useful for freshness, but delivery must be user-scoped, authenticated, observable, and backpressure-aware before high fan-out. |
| Timeouts/retries | Axios has a 15-second timeout; the UI classifies network and availability errors. | Retries should be bounded and idempotent; blindly retrying a non-idempotent POST can duplicate work. |
| Rate limiting | Express limits general and write traffic; AI has a stricter specialized limiter. | Current limits are per process/IP; at scale use shared/edge limits and user/tenant quotas. |

## 7. Domain logic worth explaining

### Opportunity tracking and analytics

Opportunity CRUD is the product's foundation. List, dashboard, calendar, board, reports, and analytics reuse the same canonical data rather than maintaining copies.

Analytics currently queries a user's opportunities and relevant interview rounds, then computes status counts, category/campus-mode counts, funnel metrics, weekly/monthly activity, hackathon submission distribution, and interview-pipeline insights in the API process.

**Why this is fine now:** it keeps reporting logic easy to understand and test, avoids premature database complexity, and a single user's dataset is likely small.

**Why it is not enough later:** it pulls and iterates through all of a user's records on each analytics request. At larger data volumes, I would push grouped aggregates into PostgreSQL, add indexes that start with `user_id`, cache per-user results, and use precomputed/materialized views or event-driven rollups for expensive metrics.

### Internship workflow: applied date versus active events

**Status: proposed, migration-gated.** The following behavior is implemented and tested locally, but becomes production behavior only after the migration named above is applied before deploying its API and frontend changes.

FutureStack is a tracker used **after** a candidate has applied for an internship. The application close date is therefore deliberately not a future deadline. An internship records `applied_on` (defaulted by the form to the user's local current date); its upcoming OA, technical, HR, or final round is an `opportunity_rounds` row with `scheduled_date` and optional `scheduled_time`.

Hackathons have a different lifecycle: `opportunities.deadline` remains the submission deadline, and only this category drives the submission dashboard, calendar markers, analytics heatmap, and in-app outbox.

**What we deliberately do not do:** retain application-close dates as active internship events or queue reminders for them. The forward migration cancels queued/leased internship deadline jobs but leaves old column values intact as legacy data; the UI ignores them rather than silently deleting historical input. New and category-converted internships store no active `deadline`.

**Scale trigger:** when users need multiple reminders, timezone-aware event times, or reliable delivery while the browser is closed, promote rounds into a general `scheduled_events` model with `TIMESTAMPTZ`, notification preferences, and a durable worker. Until then, normalized round rows plus a shared `(user_id, scheduled_date, scheduled_time)` partial index keep the simple query fast and explainable.

### Interview rounds: one source of truth for status

Each internship has ordered rounds such as online assessment, technical, HR, and final. `syncOpportunityFromRounds.js` derives the parent opportunity state after a round mutation:

- A rejected round makes the opportunity `rejected` and records the rejected round number.
- A pending round makes it `interviewed` and records the current round number.
- A cleared final round makes it `selected`.
- Completed/skipped non-final rounds lead to `shortlisted` or `interviewed` depending on progress.

**Why derive instead of asking users to manually update both records?** Two editable sources would drift. Centralizing the derivation in the backend makes the timeline and Kanban board consistent. The mutation response returns the round, synchronized opportunity, and current rounds so the client can update immediately without redundant reads.

### Interview preparation

The preparation workspace is intentionally separate from the interview timeline. The timeline represents process state; prep represents work the candidate does around that process. It holds company research, questions, technical topics, behavioral STAR stories, and reflection. The backend rejects prep operations for non-internship opportunities because the feature is semantically scoped to interviews.

### Documents and ATS guidance

For PDF/DOCX documents, `atsScorer.js` extracts text in the browser using `pdfjs-dist` and `mammoth`, then applies transparent heuristics for sections, content density, contact information, and ATS-friendly length. The result is stored alongside the document.

This is intentionally labelled as guidance, not an official ATS score. A transparent rule-based score is fast, free, works offline from the API after the file is available, and gives deterministic feedback. It does not claim to reproduce a recruiter's or vendor ATS's ranking algorithm.

### AI Resume Checker: implemented but not released

The AI system is a server-side pipeline:

1. Load PDF/DOCX content from storage.
2. Extract text.
3. Ask an LLM to construct a structured resume.
4. Optionally enrich from public GitHub information.
5. Evaluate four evidence-backed categories and generate strengths, suggestions, evidence, and scores.
6. Persist the result in `resume_ai_checks`.

It supports Gemini and local Ollama through the Vercel AI SDK. A user-provided API key can be encrypted with AES-256-GCM at rest; the API returns only safe metadata such as a key suffix.

**Why keep it gated?** LLM calls are costly, variable, and slow (the current synchronous flow can take tens of seconds). Releasing it needs provider budgeting, abuse protection, privacy copy, monitoring, an asynchronous job experience, and a deliberate feature flag rollout. Code existing is not the same as a feature being production-ready.

### Hackathon collaboration

Hackathons are not modeled as a separate top-level product. They are opportunities with `category = hackathon`, which prevents duplicate deadline/status/reporting logic. Hackathon-specific collaboration is attached only where needed: team, members, idea board and votes, task board, and submission checklist.

This is a composition-over-duplication decision: shared lifecycle data remains in `opportunities`; specialized data is normalized into specialized tables. `team_members` remains a name-only display roster, but it is not authorization. `team_memberships` stores an account and an owner/editor/viewer role; the API checks that membership before returning or changing workspace data. Invites contain only a SHA-256 hash of an opaque token and are redeemed in a row-locked database function, so two concurrent acceptance attempts cannot make one invite valid twice.

Idea voting is also enforced where concurrency exists: `idea_votes` has a `(idea_id, user_id)` primary key, while a server-only PostgreSQL function adds or removes the vote and updates `vote_count`. A non-negative `vote_count` check constraint and team-scoped vote deletion protect the aggregate and authorization boundary. The database constraint is the real duplicate-vote protection; an application-level “check then insert” alone would have a time-of-check/time-of-use race. See [ADR-003](adr/ADR-003-idempotent-voting.md) and [ADR-005](adr/ADR-005-team-memberships.md).

### Hackathon submission reminders: transactional outbox

**Status: available for in-app reminders; email is migration/config-gated.** The active-events migration has narrowed reminder intent to hackathon submission dates. The email channel requires the additional migration and server-side configuration in the next section.

An insert or submission-deadline change on a **hackathon** writes 7-day and 1-day reminder jobs in the same database transaction. Internship applications and their completed application-close dates never enqueue this outbox. A changed submission deadline, owner, or category cancels obsolete queued or leased work before replacement jobs are queued. A dispatcher leases due jobs with `FOR UPDATE SKIP LOCKED`, increments attempts, writes an idempotent `user_notifications` row, then conditionally marks the job completed, retryable, or dead; a missing conditional update is treated as a lost lease and is not counted as delivered.

The free implementation deliberately separates *durable work* from *best-effort scheduling*. `.github/workflows/dispatch-reminders.yml` posts to the token-protected dispatcher every 15 minutes only when repository secrets exist. GitHub Actions can be delayed, so I would say in an interview: “That trade-off is fine for personal deadline reminders; for strict timing, I would use an always-on scheduler or dedicated worker and alert on queue age.” It does not claim an execution SLA. See [ADR-004](adr/ADR-004-transactional-outbox.md).

### Optional Resend email delivery

An **in-app notification** here means a row persisted in `user_notifications`, shown to the signed-in user on the website's bell-icon **Notifications** page. It is not a browser push notification and it does not require the browser to be open when the reminder is generated. The page loads the user's own notification rows, lets them mark a row read, and contains the email preference toggle.

The email channel follows [ADR-007](adr/ADR-007-optional-email-reminders.md) and [ADR-008](adr/ADR-008-user-controlled-email-reminders.md). It runs **after** the idempotent website notification is written and only when two independent conditions are true: the deployment has `REMINDER_EMAILS_ENABLED=true`, `RESEND_API_KEY`, and `REMINDER_EMAIL_FROM`; and that user has selected **Email deadline reminders**. The preference is default-off to avoid assuming consent, but it is the user's choice—not an administrator-controlled product choice. A missing user account email is a successful skip; it does not retry or prevent the website notification. A configured Resend failure is retryable through the existing job lease and backoff, then appears in the existing dead-letter view.

Before enabling it, apply [`20260716120000_optional_email_reminders.sql`](../supabase/migrations/20260716120000_optional_email_reminders.sql) and [`20260716123000_user_notification_preferences.sql`](../supabase/migrations/20260716123000_user_notification_preferences.sql). The first adds `notification_email_deliveries`, keyed by `notification_job_id`, so a persisted `sent` result prevents re-sending a completed job. The second stores the authenticated user's `deadline_email_enabled` choice. The Resend request also carries `Idempotency-Key: deadline-reminder/<job-id>` to cover the failure window where Resend accepts a message but the worker fails before it records the provider response, plus the required `User-Agent` header for direct API calls. Resend keeps this key for 24 hours, so the channel is still at-least-once rather than an absolute delivery guarantee.

To create the key, visit [Resend API Keys](https://resend.com/api-keys), choose **Create API Key**, name it `FutureStack Render production`, choose **Sending access**, and limit it to the verified sender domain. Copy the resulting `re_...` value immediately—it is shown only once—and add it only to Render's backend environment. For a production sender, add and verify a domain in [Resend Domains](https://resend.com/domains) before creating the domain-restricted key.

This stays within Resend's free transactional plan as of July 16, 2026: 3,000 emails per month, 100 per day, and one custom domain. Start with `onboarding@resend.dev` only to test delivery to the account owner's email; verify a custom domain before enabling reminders for other users. Check [Resend pricing](https://resend.com/pricing/) before rollout because provider quotas can change. Do not put the API key in Vercel or any `REACT_APP_*` variable.

**What we deliberately do not do yet:** browser push notifications, open/click tracking, provider webhooks, or a permanent email audit/event stream. Those become necessary when email is a user promise rather than a best-effort convenience. The first upgrade is Resend webhooks plus delivery-event reconciliation; the next is per-reminder timing/timezone controls and a dedicated scheduler/worker.

### Read-only share links

Share links deliberately expose a **snapshot**, not live data or a recipient's access to the owner account. The server generates a 32-byte base64url token, stores a SHA-256 hash for lookup, and optionally stores an AES-256-GCM-encrypted copy so the owner can copy an active link again. Optional passcodes are hashed with PBKDF2 and verified with timing-safe comparison. The owner can control which fields appear, expire a link, or revoke it.

The public endpoint returns only the snapshot after token/passcode checks. This reduces the risk that a public page becomes an alternate route into the private dashboard.

## 8. Security posture

### Controls that exist now

- Clerk RS256 JWT verification occurs locally when `CLERK_JWT_PUBLIC_KEY` is configured; the API does not need a remote key fetch per request.
- Protected route handlers use the verified internal user ID, never a user ID supplied by the browser.
- Joi schemas validate request data at API boundaries.
- Helmet sets protective HTTP headers and CSP.
- CORS uses explicit origins from configuration.
- JSON bodies are limited to 1 MB and sanitized.
- General, write, public-share, and AI-specific rate limits exist.
- User-owned database tables have RLS policies.
- Share tokens are hashed; passcodes are salted and hashed; stored recoverable tokens and AI BYOK values are encrypted with authenticated encryption.
- Team-invite tokens are hashed before persistence; reminder dispatch has a separate bearer token and dead-letter visibility is restricted to configured internal users.
- No backend secrets are placed in `REACT_APP_*` variables.

### What I would not overclaim

- Process-local rate limiting is not enough when the API has multiple instances. It should move to a shared store such as Redis or an edge/API-gateway control.
- A service-role Supabase key is powerful. Its access should stay isolated to the server, and code review must verify every user scope.
- File uploads should gain malware scanning, file-type verification beyond extensions/MIME hints, size controls appropriate for the deployment, and quarantine behavior before enterprise rollout.
- Request IDs and JSON process logs exist, but they should become centrally retained, redacted telemetry with tracing and alerts before relying on them operationally.
- Secret rotation needs a KMS/secret-manager plan. Encryption-key rotation must support decrypting existing ciphertext or re-encrypting it safely.

### Threat-model answers

| Interviewer question | Strong answer |
| --- | --- |
| “Can one user read another user's opportunities?” | The API derives the user from a verified Clerk JWT and filters every service-role query by that internal user ID. RLS is a second layer. I would add authorization tests for every route and audit new queries in review. |
| “What if a share URL leaks?” | It grants only the selected snapshot and fields, not account access. The owner can revoke it; it can expire; an optional passcode adds a second secret. For sensitive enterprise use, I would add access logs, stronger passcode policy, recipient identity, and short-lived signed access. |
| “How do you protect BYOK keys?” | Encrypt with AES-256-GCM on the server, retain IV/auth tag separately, never return the raw key, and prefer a dedicated encryption secret. At scale, use a cloud KMS envelope-encryption design and rotate keys. |
| “What happens when Supabase is down?” | Auth bootstrap recognizes network/database failures and returns 503 rather than incorrectly reporting a bad session. Health/dependency endpoints surface degraded state. The client shows a temporary-service error. |

## 9. Reliability, testing, and operations

### Tests that exist

The repository includes frontend tests for route/render behavior and pure helpers such as date, opportunity, and ATS scoring utilities. The Chrome extension has focused metadata-extraction tests and a production build. Backend tests cover health, opportunities, analytics, documents, interview prep, rounds, share links, validation middleware, round synchronization, AI key vault behavior, resume-agent logic, and GitHub enrichment.

Before a release or PR, the standard checks are:

```bash
npm run test:ci
npm run build
npm run check:architecture
(cd backend && npm test)
(cd extensions && npm ci && npm test && npm run build)
```

`check:architecture` enforces the frontend API boundary. Tests mock Clerk and Supabase, so they do not require live secrets. Manual smoke checks remain important for sign-in, pages changed, an expected error case, upload flows, public share behavior, responsive UI, and the extension's sign-in → save → dashboard path once its Clerk/CORS configuration is present. The repository does not yet have a disposable PostgreSQL-backed concurrency suite for the vote functions; ADR-003 defines that required release-gate coverage, so the invariant must not be described as end-to-end concurrency-tested until that fixture is added.

### Observability today

- The API has health and dependency-health endpoints.
- Requests emit JSON logs with an `X-Request-Id`; dependency health includes the reminder outbox's dead-job count.
- PostHog is optional for client product analytics.
- The UI has error boundaries, loading states, toasts, and a realtime connection indicator.

### Observability needed for a serious production service

I would add structured logs with correlation IDs, distributed traces from browser to API to database, error tracking, SLO-based dashboards, synthetic probes, and alerts on error rate, latency, queue age, dependency availability, and suspicious rate-limit patterns. I would keep PII out of logs and define retention and access policy.

## 10. Scaling path: current product to millions of users

“Millions of users” is not achieved by merely adding servers. The strategy is to remove state from the API, partition work by user/tenant, avoid full scans, make slow tasks asynchronous, and measure each layer.

| Area | Current approach | First production upgrade | Large-scale direction |
| --- | --- | --- | --- |
| API compute | One Express service can hold a local cache and limits. | Stateless containers behind a load balancer; environment-based configuration. | Horizontally autoscaled regional services, safe deploys, and request budgets. |
| Auth-user mapping | Five-minute in-memory cache. | Redis cache or reliable Clerk webhook provisioning. | Shared cache with TTL/invalidations; no per-request insert/lookup surprise. |
| Rate limits | In-process/IP limits. | Redis-backed user/IP keys; tighter limits on expensive paths. | Edge WAF/API gateway, bot control, anomaly detection, and tenant quotas. |
| Core database | User-scoped rows plus targeted collaboration/outbox indexes. | Benchmark candidate composite indexes with realistic data and `EXPLAIN (ANALYZE, BUFFERS)`; then add connection pooling and backups. | Read replicas/partitioning where measured, lifecycle policies, tenant-aware capacity planning. |
| Analytics | Read all user rows and calculate in Node. | SQL `GROUP BY`, indexed date/status queries, per-user caching. | Incremental aggregates/materialized views or event-driven warehouse pipeline. |
| Realtime | Broad database-change subscription followed by full refetch. | Filtered user events and query invalidation. | Broadcast/event service with tenant channels, backpressure, idempotent versions, and presence only where needed. |
| File handling | Application-level uploads and document metadata. | Direct-to-object-storage signed uploads, strict validation and scanning. | CDN, asynchronous scanning/processing, lifecycle tiers, regional strategy. |
| AI analysis | Synchronous request with multiple LLM calls. | Durable job queue, status polling/events, retries, idempotency key, spend limits. | Separate worker pool, provider failover, per-tenant quotas, evaluation/quality monitoring. |
| Hackathon submission reminders | Transactional outbox, leased batches, in-app notifications, optional Resend email with a per-job sent record, GitHub Actions best-effort scheduler. | Monitor queue age/dead jobs, Resend failures, and daily quota; add a dedicated scheduler/worker for time-sensitive delivery. | Independently scalable workers, provider webhooks, per-tenant channel preferences, and delivery-event audit streams. |
| Secrets and encryption | Environment secrets and AES-GCM application encryption. | Managed secret store and KMS-backed envelope encryption. | Rotation, audit trails, separate keys/tenants where required, least-privilege service identities. |

### Database-specific plan

The access pattern is primarily “all data for one user, sorted/filtered by a small number of fields.” That means compound indexes should be driven by actual query plans, for example `(user_id, deadline)` for hackathon submissions, the migration-gated `(user_id, scheduled_date, scheduled_time)` for pending round events, `(user_id, status)`, and `(user_id, created_at)` where the corresponding filters/orderings are proven hot. I would not add every possible index prematurely because indexes increase write cost and storage.

For analytics, I would replace application loops with parameterized SQL aggregates or materialized per-user/day facts. For multi-tenant scale, every access path must begin with a tenant/user predicate, and background jobs must carry that context explicitly.

### Consistency and asynchronous work

The current CRUD paths are synchronous because a user expects immediate feedback. The active-events migration narrows the existing job pattern—state, unique idempotency key, attempt count, lease, error reason, retry, and dead-letter state—to hackathon submission reminders. Their durable baseline is an in-app notification. When explicitly enabled, the worker adds an optional Resend email after that notification and records the provider message ID per job; the GitHub workflow only wakes dispatch and is not the durable queue itself.

Other operations that can take seconds or call external services—AI evaluation, malware scanning, large report exports, and real email/push delivery—should use the same pattern. The UI should show queued/running/completed/failed states instead of holding an HTTP request open, and a future worker should add a trace ID and observable queue-age SLO.

### Rollout discipline

For a million-user deployment I would use feature flags, canary releases, database migrations compatible with both old and new code, observability before exposure, and a rollback path. The present AI gate is an example of the correct instinct: do not expose a capability merely because code compiles.

## 11. Key trade-offs and “why not” answers

| Question | Answer |
| --- | --- |
| Why not microservices now? | The domains are related and the team/product scale does not justify distributed coordination, network failures, and operational overhead. The modular monolith keeps boundaries in code and can be split when a measured bottleneck or ownership boundary appears. |
| Why not direct Supabase CRUD from React? | A backend boundary makes authorization, validation, rate limiting, audit events, token-sensitive operations, and migration evolution consistent. Realtime is the narrow exception and is explicitly a future hardening area. |
| Why not GraphQL? | REST resource endpoints are sufficient and easy to reason about for the current CRUD-heavy product. If client overfetching or multi-domain dashboards become a measured issue, a BFF aggregation endpoint is a simpler first step than introducing GraphQL. |
| Why not store all prep or hackathon data as JSON on opportunities? | Structured child tables support validation, targeted updates, relationships, and future querying. JSON would be faster initially but less maintainable as the features grow. |
| Why not release AI now? | Correctness, cost, privacy, latency, abuse, and user trust are product requirements, not polish. The UI flag prevents an incomplete operational system from becoming a user-facing promise. |
| Why not cache everything? | Caching introduces invalidation, privacy, and consistency complexity. I would cache hot, measured, safely scoped reads with explicit TTLs, not use it as a default. |
| Why use a service-role database client if RLS exists? | The API needs server-side administrative access, but that increases responsibility. Every query must scope by verified internal user ID; RLS remains defense in depth and direct client access stays restricted. |

## 12. Interview question bank

### Product and design

**“What did you build?”**

Use the 60-second answer, then name one end-to-end flow: add an internship, track rounds, prepare, attach a resume, and share a snapshot. That demonstrates product cohesion rather than a list of screens.

**“What is the hardest feature?”**

Choose interview-round synchronization, secure sharing, or the reminder outbox. For the outbox, explain why writing an opportunity and separately sending a notification can lose work; the transaction makes intent durable, while leases/retries/idempotency make at-least-once dispatch safe. Be candid that GitHub Actions is only a best-effort free scheduler.

**“What would you build next?”**

Start with measured operational readiness: apply the optional email migration, configure the Resend sender and backend secrets, test with one owner address, then monitor queue age/dead jobs and provider failures. Next add queue-age alerts and move AI work into a durable job flow. Tie the answer to measured need rather than a random feature list.

### Architecture and API

**“Walk me through a request.”**

Browser calls `src/services/api.js` against `/api/v1`; Axios gets a fresh Clerk token; Express assigns a request ID, applies security middleware, verifies RS256 JWT locally, resolves the internal UUID, validates the payload, applies user-aware rate limits, performs a user-scoped Supabase query, and returns JSON. The UI handles status-specific errors and refreshes its local state.

**“Why cursor pagination and an API version?”**

The cursor preserves the `(created_at, id)` position while rows are inserted, whereas a changing `OFFSET` can skip or repeat rows and gets slower with depth. `/api/v1` gives clients a stable contract; the legacy mount advertises its deprecation and sunset rather than breaking silently.

**“How do you make the app maintainable?”**

Explain the domain slices: route module + validation schema + UI component group + API service + migration + tests. Explain the architecture guardrail that prevents direct frontend database CRUD.

**“How do you avoid N+1 queries?”**

For a new endpoint, fetch related records in an intentional batch or use a join where appropriate; measure query count. The round synchronization helper accepts already-loaded rounds/status so mutation handlers can avoid duplicate reads. For analytics at scale, move aggregate work into SQL.

### Security and privacy

**“How do you secure multi-tenant data?”**

Verified identity → internal user ID → user-scoped server query → RLS defense in depth. Emphasize route tests and migration review. Do not claim that obscuring client routes or UUIDs is authorization.

**“What is your share-link security model?”**

State that a share is a snapshot of selected fields. The raw token is generated server-side; its hash is used for lookup; optional passcode is salted/hashed; public access is revocable/expiring; no private dashboard session is shared.

### Scale and reliability

**“What breaks first at 10× or 100×?”**

The broad realtime subscription/full refetch model, in-memory auth cache and rate limiter, Node-side analytics loops, synchronous AI calls, and process-only logs. Then give the staged remedies from the scale table.

**“How would you make AI reliable?”**

Move it to a queue with idempotency, timeouts, retry classification, provider fallback where appropriate, per-user quotas, retained job status, cost telemetry, quality evaluation, and a manual fallback. Keep raw resume data and prompts under a strict privacy policy.

### Testing and failure handling

**“How do you test this?”**

Unit-test pure rules such as ATS scoring and round synchronization; integration-test route behavior with mocked auth/database clients; build and test the React app in CI; enforce the API boundary; and perform manual smoke flows for auth, uploads, shares, and responsive UI. Add contract/integration tests against an ephemeral database before a high-scale rollout.

**“What did you learn from a failure?”**

The authentication path distinguishes invalid tokens from database/bootstrap failures. Returning 503 for dependency unavailability rather than a generic session-expired response reduces misleading user feedback and speeds incident diagnosis.

## 13. A two-minute demo script

1. Start on the dashboard and state the product problem in one sentence.
2. Add or open an internship; point out `Applied on`, status, and document association.
3. Open interview rounds; schedule an OA for a date/time, then explain parent-status synchronization.
4. Open interview preparation; mention the difference between process tracking and study material.
5. Show Documents and the transparent ATS guidance disclaimer.
6. Show the status board and explain that it refetches after realtime events today, then candidly state the production broadcast redesign.
7. Show a share-link flow or explain the snapshot/privacy model.
8. Close with the AI flag and scaling plan: “implemented behind a gate because operational readiness matters.”

## 14. Source map for follow-up questions

| Topic | Start in code |
| --- | --- |
| App composition, routes, lazy loading, theme | `src/App.js`, `src/context/ThemeContext.jsx` |
| Frontend API/auth/error behavior | `src/services/api.js`, `src/hooks/useAuthToken.js` |
| Auth and user provisioning | `backend/src/middleware/auth.js` |
| HTTP security, limits, health, route mounts | `backend/src/app.js` |
| Opportunity CRUD | `backend/src/routes/opportunities.js` |
| API versioning, limits, request IDs, health | `backend/src/app.js`, `docs/adr/ADR-001-versioned-api.md` |
| Round status derivation | `backend/src/lib/syncOpportunityFromRounds.js` |
| Analytics computations | `backend/src/routes/analytics.js`, `backend/src/lib/interviewPipelineAnalytics.js` |
| Documents/ATS | `src/utils/atsScorer.js`, `backend/src/routes/documents.js` |
| AI pipeline and settings | `backend/src/lib/resume-agent/`, `backend/src/lib/llm/`, `backend/src/lib/apiKeyVault.js` |
| Share security | `backend/src/lib/shareLinks.js`, share-link route modules |
| Collaboration authorization and votes | `backend/src/routes/hackathons.js`, `supabase/migrations/20260716081332_idempotent_idea_votes.sql`, `supabase/migrations/20260716083209_team_memberships_and_invites.sql`, `supabase/migrations/20260716100000_review_hardening.sql` |
| Website notifications, reminder outbox, and email preference | `src/pages/Notifications.jsx`, `backend/src/routes/notifications.js`, `backend/src/routes/notification-preferences.js`, `backend/src/lib/reminderJobs.js`, `backend/src/lib/reminderEmail.js`, `.github/workflows/dispatch-reminders.yml`, `supabase/migrations/20260716082400_transactional_reminder_outbox.sql`, `supabase/migrations/20260716120000_optional_email_reminders.sql`, `supabase/migrations/20260716123000_user_notification_preferences.sql` |
| Active internship events | `src/components/rounds/`, `backend/src/routes/upcoming-rounds.js`, `supabase/migrations/20260716110000_rounds_drive_active_events.sql` |
| SQL schema and policies | `docs/*.sql`, `supabase/migrations/` |
| Tests and CI | `docs/TESTING.md`, `backend/tests/`, `.github/workflows/ci.yml` |

## 15. Final framing

Present FutureTracker as a well-bounded full-stack product, not as a finished hyperscale platform. The best answer is: **I built a secure modular monolith that solves a coherent user workflow today; I understand exactly which assumptions are safe at this stage, which ones are not, and how I would evolve each layer when traffic, data volume, and operational requirements justify it.**

For implementation-only feature detail, use the focused guides in this repository. This document intentionally contains the architecture narrative, decision rationale, limitations, and interview answers so you can prepare from one place.
