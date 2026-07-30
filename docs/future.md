# FutureTracker Roadmap

Last reviewed: July 30, 2026

This roadmap contains future work only. For implemented and gated capabilities, see [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Release priorities

### Production readiness

- [ ] Complete AI Resume Checker rollout review: provider costs, abuse controls, privacy copy, monitoring, and a staged frontend enablement plan.
- [ ] Add production error monitoring and actionable alerting for frontend and API failures.
- [ ] Add a tested backup and recovery runbook for Supabase data and migrations.
- [ ] Replace process-local caches with a shared cache only if multi-instance scale makes it necessary.

### Career workflow

- [ ] Per-user reminder timing and timezone preferences beyond the current hackathon 7-day/1-day outbox.
- [ ] Timestamped notes and a follow-up timeline for each opportunity.
- [ ] Tags, saved filters, bulk actions, and CSV/JSON import/export.
- [ ] Calendar integration for interview scheduling.
- [ ] Mentor comments on a scoped shared view.

### Accessibility and experience

- [ ] Expand keyboard navigation coverage and verify focus management in every modal and status-board interaction.
- [ ] Audit ARIA labels, live regions, and screen-reader flows.
- [ ] Respect reduced-motion preferences in animations.
- [ ] Evaluate offline/PWA support after defining an offline data-conflict strategy.

### AI extensions

- [ ] Job-description-aware resume evaluation.
- [ ] Resume bullet-point improvement suggestions with clear user review before changes.
- [ ] Tailored cover-letter drafts.
- [ ] Interview-question generation using resume and opportunity context.

## Technical guardrails

- Preserve the API boundary: frontend data mutations must remain in Express routes, not direct Supabase CRUD.
- Treat migrations and RLS policies as security-critical review items.
- Keep public share snapshots redacted and independently tested for expiry, revocation, and passcode behavior.
- Scale analytics with database aggregation and caching only when measurement shows the current approach needs it.
