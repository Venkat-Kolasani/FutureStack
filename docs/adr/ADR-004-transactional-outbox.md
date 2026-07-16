# ADR-004: Transactional outbox for deadline reminders

- Date written: 2026-07-16
- Status: Proposed

## Problem

Reminder delivery should not be lost when a request or scheduler fails after business state changes.

## Assumptions

The project must remain free-tier-only. Deadline reminders are best-effort and can tolerate scheduler delay; interactive AI checks cannot.

## Options considered

1. Send reminders inside API requests.
2. Add a paid managed queue and dedicated worker now.
3. Persist jobs in PostgreSQL and dispatch bounded batches from a GitHub Actions schedule.

## Decision

Use a transactional outbox with leases, retries, deduplication, and a dead-letter state. GitHub Actions triggers the dispatcher as a best-effort free scheduler.

## Consequences and failure modes

GitHub Actions has no strict execution SLA. Dead jobs and delayed schedules must be visible in readiness and owner-only job endpoints. Strict-timing workflows require a dedicated worker later.

## Metrics and revisit threshold

Track queued-job age, retry count, dead-job count, and dispatch duration. Move to a dedicated worker when reminders regularly exceed the documented tolerance or strict timing is needed.
