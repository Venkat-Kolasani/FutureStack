# ADR-002: Cursor pagination and query-driven indexes

- Date written: 2026-07-16
- Status: Proposed

## Problem

The opportunity dashboard currently returns a user's complete history. Response size and offset pagination become unstable as the history grows.

## Assumptions

Most opportunity reads are user-scoped and ordered by creation time. The free-tier deployment needs local, reproducible evidence before additional infrastructure is considered.

## Options considered

1. Continue returning every row.
2. Use limit/offset pagination.
3. Use a stable `(created_at, id)` cursor and composite indexes matched to the query.

## Decision

Use cursor pagination with a default limit of 25 and a maximum of 100. Add indexes only after capturing `EXPLAIN (ANALYZE, BUFFERS)` for representative seeded data.

## Consequences and failure modes

Cursors require explicit validation and deterministic ordering. Invalid cursors return a structured 400 response; a new record appearing during pagination must not duplicate a prior item.

## Metrics and revisit threshold

Measure plans and execution time on a 50,000-row disposable dataset. Reassess query design when dashboard read p95 exceeds 300 ms or the data model changes materially.
