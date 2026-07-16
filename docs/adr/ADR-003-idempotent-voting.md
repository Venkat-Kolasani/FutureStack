# ADR-003: Database-enforced idempotent voting

- Date written: 2026-07-16
- Status: Accepted

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

## Deployment verification

The source implementation and API contract are covered by mocked integration tests. Before merging a change to this voting contract, an automated PostgreSQL-backed concurrency test is required: apply the migration-backed schema to a disposable database, issue parallel cast and remove calls, assert composite-key conflict handling, atomic count updates, and exactly one persisted vote. The repository does not yet provide that disposable database fixture, so this invariant is documented as database-enforced but not yet end-to-end concurrency-verified; do not represent it as verified until the test is wired into CI and passing.
