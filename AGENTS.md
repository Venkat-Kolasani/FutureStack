# FutureStack Engineering Guide

## Project intent

FutureStack is a production-oriented career and hackathon workspace. `docs/DOCUMENTATION.md` is the canonical interview-preparation document: keep its current-state claims, decisions, benchmarks, and scale roadmap accurate whenever behavior changes.

## Architecture boundaries

- Keep browser data access behind `src/services/api.js`. The frontend may use Supabase only for realtime subscriptions that trigger an API refetch; it must not perform CRUD with `supabase.from()`.
- Every protected backend route must use `requireAuth` and scope database access with `req.auth.internalUserId`.
- Validate every v1 route body, query, and parameter with the shared Joi middleware before database access.
- Treat PostgreSQL constraints as the final guard for invariants that must remain correct under concurrent requests.
- Do not expose Supabase service-role credentials to the browser or add paid infrastructure without an explicit user request.

## Quality bar

- Prefer small, conventional modules over speculative abstractions. Do not add duplicate files, generated filler, unused dependencies, or misleading comments.
- Add or update tests for every route, validation rule, migration invariant, and user-visible behavior changed.
- For schema work, add a timestamped migration in `supabase/migrations/`, document the rollout in `docs/DOCUMENTATION.md`, and preserve RLS/authorization boundaries.
- Record measurable claims (latency, bundle size, availability, Lighthouse) with a date, method, and source. Label unverified figures as historical rather than current.

## Verification

Run the relevant commands before committing:

```bash
npm run test:ci
npm run build
cd backend && npm test && cd ..
npm run check:architecture
git diff --check
```

Run targeted backend suites for route and migration changes. Validate Markdown links and headings when documentation changes.

## Git workflow

- Preserve unrelated working-tree changes. Stage only files belonging to the focused change.
- Use one focused conventional commit per independently reviewable change.
- Inspect the staged diff and run the relevant checks before each commit.
- Push verified commits to the requested branch. Do not force-push unless the user explicitly asks.
