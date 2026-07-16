# ADR-006: Interview rounds are the active events for internships

- Date written: 2026-07-16
- Status: Proposed

## Context

FutureStack records internships after a user has applied. Treating a job-posting close date as a future deadline produced misleading dashboard warnings, calendar entries, reports, shares, analytics, and reminder jobs.

## Decision

Store `opportunities.applied_on` for internships and use pending `opportunity_rounds.scheduled_date` plus optional `scheduled_time` as their active events. Reserve `opportunities.deadline` and the transactional reminder outbox for hackathon submissions. The forward migration cancels queued/processing internship deadline jobs and does not delete old application-close values.

## Alternatives considered

1. Keep using application-close dates for every opportunity. Rejected: the date is already in the past when the application is added.
2. Add an unrelated generic events table now. Rejected: it duplicates the existing normalized round model before recurring events, timezone-aware times, or multi-channel reminders are needed.
3. Store only the application timestamp and show no upcoming internship events. Rejected: it loses the user’s actual next action: OA/interview scheduling.

## Consequences

This is a category-aware data model: dashboards, calendar, reports, public shares, analytics, and the outbox will use deadlines only for hackathons. Historic rows will receive `created_at::date` as a correctable applied-on approximation. An index on pending `(user_id, scheduled_date, scheduled_time)` supports upcoming-round reads.

## Revisit threshold

Introduce a general `scheduled_events` table with `TIMESTAMPTZ`, timezone handling, preferences, and durable delivery when users need recurring non-round events, multiple notifications, or reminders that must fire while the browser is closed.
