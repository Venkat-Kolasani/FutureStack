### Summary

Track **multi-round interview pipelines** per internship opportunity (OA → Technical → HR → Final, etc.) with a visual timeline, per-round results, and rejection-at-round visibility.

**Status:** Shipped (schema + API + UI on `main` / PR #56).

### Problem

Today `opportunities.status` is a single flat value (`applied`, `shortlisted`, `interviewed`, `selected`, `rejected`). Real hiring flows have many rounds; users cannot record where they are, what is upcoming, or which round they failed.

### Solution (5 PRs)

| PR | Issue | Scope | Status |
|----|-------|--------|--------|
| 1 | DB schema | `opportunity_rounds` table + RLS + opportunity columns | ✅ Merged |
| 2 | API | CRUD + status sync helper | ✅ Merged |
| 3 | UI | Presentational `RoundTimeline` | ✅ Merged |
| 4 | UI | `AddRoundModal` + helpers | ✅ Merged |
| 5 | Integration | Wire into detail modal + card badges | ✅ PR #56 |

### Design decisions (read before any PR)

1. **Internships only** — hackathons use `/hackathons/:id` collaboration; rounds are not for `category = 'hackathon'`.
2. **No `current_stage` column** — keep existing `opportunities.status` for Kanban/analytics. Add `current_round_number` and `rejected_round_number` for quick display. Backend syncs `status` when round results change.
3. **API via Express only** — frontend uses `src/services/api.js`; no `supabase.from()` for rounds.
4. **Nested routes** — follow hackathons pattern: `/api/opportunities/:opportunityId/rounds`.
5. **Tailwind only** — no separate CSS files.
6. **Unified mutation responses** — POST/PATCH/DELETE return `{ round, opportunity, rounds }` so the UI does not refetch after every save (performance).

### Status sync rules

| Condition | `opportunities.status` | `rejected_round_number` | `current_round_number` |
|-----------|------------------------|-------------------------|------------------------|
| No rounds | `applied` | null | null |
| Any round `rejected` | `rejected` | that round # | null |
| `final` round `cleared` | `selected` | null | earliest pending, else null |
| Interview round `cleared` (`technical`, `hr`, `group_discussion`, `managerial`) | `interviewed` | null | earliest pending, else null |
| Screening round `cleared` (`resume_shortlisted`, `oa`, `assignment`, `technical_assignment`) | `shortlisted` | null | earliest pending, else null |
| Otherwise (pending, skipped, or `other` only) | `applied` | null | earliest pending, else null |

### Performance fix (post-launch)

Slow round save was caused by 6 sequential Supabase calls on create + 2 frontend refetches. Fixed by batching round list read, preloading sync inputs, and applying mutation response in the UI. See [`docs/interview-rounds.md`](../interview-rounds.md#performance-issue--fix).

### Out of scope (follow-ups)

- Calendar reminders per round
- Analytics funnel by round type
- Browser extension auto-import

### Migration

SQL: [`docs/opportunity-rounds-migration.sql`](../opportunity-rounds-migration.sql)

### Interview reference

[`docs/interview-rounds.md`](../interview-rounds.md) — problem, architecture, API, performance story, testing.
