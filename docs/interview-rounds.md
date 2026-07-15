# Interview Round Tracking

> **Interview talking point:** Multi-round hiring pipelines for internships — timeline UI, automatic Kanban status sync, and a performance fix that cut save latency by eliminating redundant database round-trips and frontend refetches.

## Problem

`opportunities.status` alone (`applied`, `shortlisted`, `interviewed`, …) cannot represent real hiring flows:

- Users need to record **each round** (OA, technical, HR, final) with type, date, result, and notes.
- Users need to see **where they failed** (`Rejected at Round 2`) or **what is next** (`Round 3 · In progress`).
- Kanban and analytics must stay consistent without a separate `current_stage` column.

## Solution overview

| Layer | What we built |
|-------|----------------|
| **Database** | `opportunity_rounds` table + `current_round_number` / `rejected_round_number` on `opportunities` |
| **Backend** | Nested REST routes under `/api/opportunities/:id/rounds` + `syncOpportunityFromRounds()` |
| **Frontend** | `RoundTimeline`, `AddRoundModal`, `roundService` in `api.js`, internship detail drawer + card badges |

**Scope:** internships only (`category === 'internship'`). Hackathons use the collaboration workspace.

**Architecture rule:** all round reads/writes go through Express (`roundService`). No `supabase.from()` for rounds in the frontend.

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/opportunities/:opportunityId/rounds` | List rounds (ordered by `round_number`) |
| POST | `/api/opportunities/:opportunityId/rounds` | Create round (auto `round_number` if omitted) |
| PATCH | `/api/opportunities/:opportunityId/rounds/:roundId` | Update type, date, result, notes |
| DELETE | `/api/opportunities/:opportunityId/rounds/:roundId` | Delete round; re-sync parent opportunity |

### Mutation response shape (POST / PATCH / DELETE)

Mutations return everything the UI needs in **one response** — no follow-up refetch required:

```json
{
  "round": { "id": "...", "round_number": 2, "round_type": "technical", "result": "pending", ... },
  "opportunity": { "id": "...", "status": "interviewed", "current_round_number": 2, "rejected_round_number": null, ... },
  "rounds": [ /* full ordered list after the mutation */ ]
}
```

DELETE also includes `"success": true` and `"message": "Round deleted"`.

### Status sync rules

Implemented in `backend/src/lib/syncOpportunityFromRounds.js` → `deriveOpportunityFieldsFromRounds()`:

| Condition | `status` | `current_round_number` | `rejected_round_number` |
|-----------|----------|------------------------|-------------------------|
| No rounds | unchanged | `null` | `null` |
| Any round `rejected` | `rejected` | `null` | that round # |
| A round `pending` | `interviewed` | that round # | `null` |
| All cleared/skipped, not final | `shortlisted` or `interviewed` | `null` | `null` |
| `final` round `cleared` | `selected` | `null` | `null` |

---

## Performance issue & fix

### Symptom

Saving a round felt slow: long wait from clicking **Add round** until the success toast and timeline update.

### Root cause (naive first implementation)

**Backend — 6 sequential Supabase calls per create:**

1. Verify opportunity exists  
2. Query max `round_number`  
3. Insert round  
4. `syncOpportunityFromRounds`: fetch opportunity again  
5. Fetch all rounds again  
6. Patch opportunity  

Each remote DB hop adds ~100–300ms+ → multi-second saves.

**Frontend — 2 extra API calls after create:**

1. `GET /opportunities/:id`  
2. `GET /opportunities/:id/rounds`  

The modal stayed on **Saving…** until both completed, even after the create returned.

### Fix

**Backend (fewer round-trips):**

1. Fetch all rounds **once** at the start of create (also used for next `round_number`).
2. Insert the new round.
3. Call `syncOpportunityFromRounds()` with **preloaded** `existingStatus` and `rounds` so sync skips redundant SELECTs — only the final UPDATE hits the DB.
4. Return `{ round, opportunity, rounds }` from POST, PATCH, and DELETE.

**Create path:** 6 DB calls → **4** (verify → list rounds → insert → update opportunity).

**Frontend (no blocking refetch):**

1. Apply `opportunity` and `rounds` from the mutation response directly to React state.
2. Close modal and show toast immediately.
3. Update internship list via `onOpportunityUpdated` callback (card badges stay in sync).

### Key files

| File | Role |
|------|------|
| `backend/src/routes/opportunity-rounds.js` | Optimized create/update/delete flow |
| `backend/src/lib/syncOpportunityFromRounds.js` | Optional `existingStatus` + `rounds` to skip reads |
| `src/components/opportunities/OpportunityDetailModal.jsx` | `applyRoundMutationResult()` — no post-save refetch |
| `src/services/api.js` | `roundService` |

### Interview one-liner

> “Round save was slow because we chained six Supabase queries on create plus two frontend refetches. I batched the round list read, passed derived state into sync to skip duplicate SELECTs, returned the full payload from the mutation, and updated the UI from that single response instead of blocking on refetch.”

---

## Frontend components

```
src/components/rounds/
├── RoundTimeline.jsx    # Vertical stepper (presentational)
└── AddRoundModal.jsx    # Create / edit form

src/utils/roundHelpers.js   # Labels, enums, card summary text
src/services/api.js           # roundService
```

**Integration points:**

- `OpportunityDetailModal` — Interview Pipeline section (internships only)
- `OpportunityCard` — compact badge via `getRoundSummaryLabel()`
- `InternshipList` — `onOpportunityUpdated` keeps list + drawer in sync

---

## Analytics & reports

`GET /api/analytics` includes `pipelineAnalytics` — built server-side from internship opportunities and their rounds in **one batched query** (no per-internship round fetches).

| Field | Meaning |
|-------|---------|
| `rejectedCount` | Internships with `status: rejected` |
| `averageRoundsBeforeRejection` | Mean `rejected_round_number` across rejections |
| `rejectionByRoundNumber` | Histogram: which round number you were cut at |
| `rejectionByRoundType` | Histogram: OA, technical, HR, etc. |
| `rejections` | Per-internship log: title, stage label (`Round 2 · Technical Interview`), rounds cleared before |

**UI surfaces:**

- **Analytics** (`InterviewRejectionInsights`) — metric cards, bar charts, rejection log table
- **Reports** — same insights (compact), per-opportunity “Rejected at” in preview; PDF includes pipeline summary + per-internship stage

**Backend:** `backend/src/lib/interviewPipelineAnalytics.js`  
**Frontend:** `src/components/analytics/InterviewRejectionInsights.jsx`

---

## Testing

```bash
# Automated
cd backend && npm test -- rounds
npm run test:ci
npm run check:architecture

# Schema (after migration)
npm run verify:rounds-schema

# Manual API smoke (needs Clerk JWT)
export CLERK_TOKEN="$(# browser: copy(await window.Clerk.session.getToken()))"
./scripts/test-rounds-api.sh
```

**Manual UX checklist:**

1. Open internship → **Interview Pipeline** → **Add round**
2. Save should feel snappy; toast + timeline update without long **Saving…**
3. Mark round rejected → status `rejected`, banner + card badge update
4. Clear final round → status `selected`
5. Hackathon detail drawer must **not** show rounds UI

---

## Related docs

- Migration SQL: [`opportunity-rounds-migration.sql`](opportunity-rounds-migration.sql)
- Interview prep (study workspace): [`interview-prep.md`](interview-prep.md)
- Code orientation: [`CODEBASE_GUIDE.md`](CODEBASE_GUIDE.md)
- Epic & PR breakdown: [`issues/interview-rounds-epic.md`](issues/interview-rounds-epic.md)
