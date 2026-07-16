# Project Status

Last reviewed: July 16, 2026

This is the source of truth for the repository's product status. It distinguishes code that is available in the app from code that is intentionally gated or planned.

| Capability | Status | Notes |
| --- | --- | --- |
| Opportunity tracking | Available | Create, edit, delete, search, filter, and classify internship and hackathon opportunities. |
| Dashboard, calendar, status board, reports | Available | Includes deadline views, realtime board refreshes, analytics, and PDF export. |
| Light and dark theme | Available | Persisted user preference with themed Clerk UI and app-wide contrast work. |
| Interview rounds | Available | Internship-only multi-round timeline with automatic parent-status synchronization. |
| Interview preparation | Available | Research, questions, technical topics, STAR stories, and reflections per internship. |
| Documents and ATS guidance | Available | Document vault, opportunity links, PDF/DOCX text extraction, and client-side rule-based ATS hints. |
| Hackathon collaboration | Implemented, migration-gated | Account-backed owner/editor/viewer access, hashed single-use invites, idempotent ideas/votes, tasks, and a checklist. Apply the four July 16 collaboration migrations before enabling it in a database. |
| API contract | Available | `/api/v1` is canonical. Legacy `/api` clients receive deprecation and sunset headers; opportunity lists use cursor pagination. |
| In-app deadline reminders | Implemented, scheduler-gated | A transactional outbox, leased dispatcher, retries, and dead-letter visibility are implemented. The optional free GitHub Actions scheduler needs secrets and is best-effort; no email delivery is claimed. |
| Read-only share links | Available | Expiring or revocable snapshots with optional passcode verification. |
| AI Resume Checker | Implemented, UI gated | Backend pipeline, persistence, provider settings, and tests exist. `AI_RESUME_CHECK_ENABLED` is `false` in `src/config/features.js`, so users see it as coming soon. |
| Email delivery, tags, bulk import/export, advanced filters | Planned | See [future.md](future.md). Email is intentionally separate from the in-app reminder outbox. |

## Release safeguards

- The API is protected by Clerk authentication, request validation, Helmet headers, CORS configuration, and rate limiting.
- Application data is accessed through the Express API; the frontend does not perform Supabase CRUD.
- Supabase migrations apply Row-Level Security to product tables.
- The reminder dispatcher is separately token-protected; GitHub Actions scheduling is accepted only for best-effort timing on the free tier.
- AI analysis should remain gated until its provider configuration, budget, privacy review, and production monitoring are explicitly approved.

## Documentation boundaries

Feature guides describe the code in this repository. Files in `docs/issues/` are historical implementation plans and may intentionally describe intermediate milestones rather than the finished product.
