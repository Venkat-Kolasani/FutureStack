# ADR-005: Account-backed team memberships

- Date written: 2026-07-16
- Status: Proposed

## Problem

Current hackathon members are names rather than authenticated users, so permissions and collaborative ownership cannot be enforced.

## Assumptions

This is a later milestone after the smaller correctness and reliability changes are complete.

## Options considered

1. Retain name-only members.
2. Add broad team access without roles.
3. Add account-backed membership, roles, and expiring invite links.

## Decision

Use membership rows with `owner`, `editor`, and `viewer` roles plus hashed, expiring, single-use invite links.

## Consequences and failure modes

The feature adds material authorization complexity. Role checks belong in the API and database constraints must protect uniqueness and references.

## Metrics and revisit threshold

Implement after the voting and reminder milestones. Revisit role granularity only when collaborators need permissions beyond the three defined roles.
