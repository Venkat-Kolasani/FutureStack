# ADR-005: Account-backed team memberships

- Date written: 2026-07-16
- Status: Accepted

## Problem

Current hackathon members are names rather than authenticated users, so permissions and collaborative ownership cannot be enforced.

## Assumptions

The idempotent-vote and reminder-outbox source changes are complete first. This is the next collaboration milestone; deployment still requires the versioned Supabase migration.

## Options considered

1. Retain name-only members.
2. Add broad team access without roles.
3. Add account-backed membership, roles, and expiring invite links.

## Decision

Use membership rows with `owner`, `editor`, and `viewer` roles plus hashed, expiring, single-use invite links.

## Consequences and failure modes

The feature adds material authorization complexity. The Express API is the authorization boundary because it uses the Supabase service role; every workspace operation resolves a membership before returning or mutating data. The database protects membership uniqueness and invite expiry, while invite storage contains only a SHA-256 hash of the shareable token. `team_members` remains a name-only roster and must never be treated as authorization data.

An invite is single-use because redemption locks its row (`FOR UPDATE`), creates or updates the membership, then marks the invite accepted in one transaction. A leaked invite can be used only until expiry or first redemption; there is not yet an owner revocation endpoint, so the owner should create a new invite rather than share a link broadly.

## Metrics and revisit threshold

Apply and verify `20260716083209_team_memberships_and_invites.sql` in a disposable Supabase project before enabling the UI. Test owner, editor, viewer, expired-token, duplicate-redemption, and collaborator-access paths. Revisit role granularity only when collaborators need permissions beyond the three defined roles; add invite revocation when owners need to withdraw an unredeemed link.
