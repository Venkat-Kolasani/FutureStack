# Architecture Decision Records

Architecture Decision Records (ADRs) capture the reasoning that precedes implementation. Their date and commit history are part of the evidence that FutureStack's architecture evolved through deliberate trade-offs.

## Required format

```md
# ADR-NNN: Title

- Date written: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded

## Problem

## Assumptions

## Options considered

## Decision

## Consequences and failure modes

## Metrics and revisit threshold
```

Update an ADR's status only when its corresponding implementation is complete and verified.

## Accepted decisions

- [ADR-001: Versioned API](ADR-001-versioned-api.md)
- [ADR-002: Pagination and indexes](ADR-002-pagination-and-indexes.md)
- [ADR-003: Idempotent voting](ADR-003-idempotent-voting.md)
- [ADR-004: Deadline reminder outbox](ADR-004-transactional-outbox.md)
- [ADR-005: Team memberships](ADR-005-team-memberships.md)
- [ADR-007: Optional email delivery for deadline reminders](ADR-007-optional-email-reminders.md)

## Proposed decisions

- [ADR-006: Interview rounds as active internship events](ADR-006-interview-rounds-as-active-events.md)
