# ADR-007: Optional email delivery for deadline reminders

- Date written: 2026-07-16
- Status: Accepted

## Problem

In-app notifications are durable, but a user may not have FutureStack open when a hackathon submission deadline approaches. The reminder outbox needs an optional email channel without making an opportunity write depend on an external email provider or adding a paid service.

## Assumptions

- FutureStack remains within free tiers.
- Hackathon submission reminders are best-effort; they do not require a strict delivery SLA.
- An in-app notification remains the durable, user-visible baseline when email is disabled or a user has no stored account email.
- The worker already provides at-least-once processing through a database lease, bounded retry, and dead-letter state.

## Options considered

1. Send an email directly from the opportunity create/update request.
2. Add a paid managed queue or a permanently running worker.
3. Use Resend in the existing leased dispatcher, with a durable per-job email-delivery record.
4. Use a browser-driven mail client or a free consumer SMTP account.

## Decision

Keep PostgreSQL as the system of record. After the dispatcher writes its idempotent in-app notification, it optionally delivers an email through Resend when explicitly enabled with server-side environment variables. A `notification_email_deliveries` row, unique per notification job, records a successful provider delivery so completed jobs are never sent again. The Resend request also uses a job-derived `Idempotency-Key`, protecting a retry when a provider response succeeds but the worker fails before persisting the delivery result.

Email is disabled by default. Missing configuration or a missing account email does not block the in-app notification. A configured provider error is retried by the existing outbox, then becomes visible in the existing dead-letter flow.

## Consequences and failure modes

This avoids a new paid queue and keeps external I/O off request paths, but email delivery is at-least-once rather than a strict guarantee. Resend retains idempotency keys for 24 hours, so a response that is lost for longer than that can still require provider/webhook reconciliation at higher scale. The free plan's quota and daily cap also mean the channel is intentionally limited.

The migration must be applied before setting `REMINDER_EMAILS_ENABLED=true`; otherwise the worker will safely retry and eventually dead-letter configured email jobs rather than silently claiming delivery.

## Metrics and revisit threshold

Track email delivery failures, retry/dead-job counts, provider response latency, and the daily email volume. Add Resend delivery webhooks, per-user notification preferences, and a durable provider-event audit when users rely on email for time-sensitive workflows or the free-plan daily cap becomes a constraint.
