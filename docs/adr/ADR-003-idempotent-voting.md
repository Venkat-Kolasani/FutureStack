# ADR-003: Database-enforced idempotent voting

- Date written: 2026-07-16
- Status: Proposed

## Problem

The current brainstorm idea vote is a mutable aggregate counter. It cannot identify an actor or prevent duplicate votes under concurrent requests.

## Assumptions

All application writes flow through the Express API using the authenticated internal user ID.

## Options considered

1. Check whether a user voted in application code, then increment the counter.
2. Lock the idea row before each vote.
3. Store one vote per `(idea_id, user_id)` and enforce uniqueness in PostgreSQL.

## Decision

Use an `idea_votes` table with a composite primary key. The API is idempotent and a derived count is updated atomically with vote creation or deletion.

## Consequences and failure modes

Application-level check-then-insert logic remains unsafe because concurrent requests can race. The database invariant is the final correctness boundary.

## Metrics and revisit threshold

Test parallel retries and assert one persisted vote. Revisit the derived-count strategy only when vote traffic makes a direct aggregate query too expensive.
