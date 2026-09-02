# Project Status

Last reviewed: August 24, 2026

This is the source of truth for the repository's product status. It distinguishes code that is available in the app from code that is intentionally gated or planned.

| Capability | Status | Notes |
| --- | --- | --- |
| Opportunity tracking | Available | Create, edit, delete, search, filter, and classify internship and hackathon opportunities. On-campus vs off-campus mode on internships and in list filters. |
| Chrome MV3 opportunity saver | Implemented, configuration-gated | Side panel collects LinkedIn/Greenhouse/Lever (and generic) job fields, lets users append selected page text, supports campus mode, syncs a Clerk session, and saves through the API. Requires extension build/load, Clerk allowed-origin, and backend CORS setup. See [extensions/readme.md](../extensions/readme.md). |
| Active-event dashboard, calendar, status board, reports | Available after migration | With `20260716110000_rounds_drive_active_events.sql` applied, internships use **Applied on**, scheduled rounds drive calendar/dashboard events, and hackathon **deadline** remains the submission date. |
| Light and dark theme | Available | Persisted user preference with themed Clerk UI and app-wide contrast work. |
| Interview rounds | Available | Internship-only multi-round timeline with optional scheduled date/time; parent status synchronizes server-side. |
| Interview preparation | Available | Research, questions, technical topics, STAR stories, and reflections per internship. |
| Documents and ATS guidance | Available | Document vault, opportunity links, PDF/DOCX text extraction, and client-side rule-based ATS hints. |
| Hackathon collaboration | Implemented, migration-gated | Account-backed owner/editor/viewer access, hashed single-use invites, idempotent ideas/votes, tasks, and a checklist. Apply the July collaboration migrations before enabling in a database. |
| Analytics and PDF reports | Available | Funnel, campus-mode, rejection-round, and hackathon-submission insights; exportable PDF summaries. |
| In-app notification center | Available | Bell page lists persisted website notifications; users can mark items read. |
| Hackathon submission reminders | Available, scheduler-configured | Transactional outbox writes in-app notifications for hackathon submission dates. Optional GitHub Actions dispatcher is best-effort on the free tier. |
| Optional Resend email reminders | Implemented, migration/config-gated | User opt-in on the Notifications page; dispatcher sends after in-app notification when `REMINDER_EMAILS_ENABLED` and Resend env vars are set. Missing `users.email` is resolved from Clerk at send time. |
| Read-only share links | Available | Expiring or revocable snapshots with optional passcode verification. |
| AI Resume Checker | Implemented, UI gated | Backend pipeline, persistence, provider settings, and tests exist. `AI_RESUME_CHECK_ENABLED` is `false` in `src/config/features.js`. |
| Tags, bulk import/export, advanced filters | Planned | See [future.md](future.md). |
| Progress Logger | Available | `/progress` now logs real prep tracks against `/api/v1/progress`. The heatmap is live user data, not a mock. |

## Release safeguards

- The API is protected by Clerk authentication, request validation, Helmet headers, CORS configuration, and rate limiting.
- Application data is accessed through the Express API; the frontend does not perform Supabase CRUD.
- Supabase migrations apply Row-Level Security to product tables.
- The reminder dispatcher is separately token-protected; GitHub Actions scheduling is accepted only for best-effort timing on the free tier.
- AI analysis should remain gated until its provider configuration, budget, privacy review, and production monitoring are explicitly approved.

## Documentation boundaries

Feature guides describe the code in this repository. Files in `docs/issues/` are historical implementation plans and may intentionally describe intermediate milestones rather than the finished product.
