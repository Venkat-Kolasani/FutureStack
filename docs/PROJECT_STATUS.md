# Project Status

Last reviewed: July 15, 2026

This is the source of truth for the repository's product status. It distinguishes code that is available in the app from code that is intentionally gated or planned.

| Capability | Status | Notes |
| --- | --- | --- |
| Opportunity tracking | Available | Create, edit, delete, search, filter, and classify internship and hackathon opportunities. |
| Dashboard, calendar, status board, reports | Available | Includes deadline views, realtime board refreshes, analytics, and PDF export. |
| Light and dark theme | Available | Persisted user preference with themed Clerk UI and app-wide contrast work. |
| Interview rounds | Available | Internship-only multi-round timeline with automatic parent-status synchronization. |
| Interview preparation | Available | Research, questions, technical topics, STAR stories, and reflections per internship. |
| Documents and ATS guidance | Available | Document vault, opportunity links, PDF/DOCX text extraction, and client-side rule-based ATS hints. |
| Hackathon collaboration | Available | Team details, members, ideas and votes, tasks, and submission checklist. |
| Read-only share links | Available | Expiring or revocable snapshots with optional passcode verification. |
| AI Resume Checker | Implemented, UI gated | Backend pipeline, persistence, provider settings, and tests exist. `AI_RESUME_CHECK_ENABLED` is `false` in `src/config/features.js`, so users see it as coming soon. |
| Email reminders, tags, bulk import/export, advanced filters | Planned | See [future.md](future.md). |

## Release safeguards

- The API is protected by Clerk authentication, request validation, Helmet headers, CORS configuration, and rate limiting.
- Application data is accessed through the Express API; the frontend does not perform Supabase CRUD.
- Supabase migrations apply Row-Level Security to product tables.
- AI analysis should remain gated until its provider configuration, budget, privacy review, and production monitoring are explicitly approved.

## Documentation boundaries

Feature guides describe the code in this repository. Files in `docs/issues/` are historical implementation plans and may intentionally describe intermediate milestones rather than the finished product.
