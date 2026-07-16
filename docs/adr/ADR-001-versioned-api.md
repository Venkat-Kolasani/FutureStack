# ADR-001: Versioned REST API

- Date written: 2026-07-16
- Status: Proposed

## Problem

The React client, browser extension, and future external clients need a stable API contract while FutureStack continues to evolve.

## Assumptions

The current backend exposes unversioned `/api/*` routes and the first versioned contract can be introduced without supporting third-party production clients.

## Options considered

1. Keep unversioned routes indefinitely.
2. Version only when a breaking change is required.
3. Introduce `/api/v1` now and treat it as a documented contract.

## Decision

Introduce `/api/v1`. Additive fields and endpoints remain compatible within v1. Breaking request or response changes require a new version and a documented deprecation window.

## Consequences and failure modes

The frontend and operational probes must move together. A missed route, hard-coded URL, or unversioned test can cause a client outage, so contract tests and a temporary compatibility redirect are required during migration.

## Metrics and revisit threshold

Track unversioned-route requests during the compatibility window. Remove the legacy prefix only after it has no known consumers and the sunset date passes.
