# Maintainer Review Checklist

Short red flags when reviewing GSSoC and community PRs. Automated checks catch some of these; the rest need human review.

## Architecture

- [ ] **No frontend CRUD via Supabase** — data goes through Express + Clerk JWT, not `supabase.from()` in components
- [ ] **No service role or secrets in `src/`** — architecture-check enforces this; still scan the diff
- [ ] **Auth on every protected route** — `requireAuth` middleware present; handlers use `req.auth.internalUserId` for `user_id` filters
- [ ] **Validation at the boundary** — use schemas under `backend/src/validation/` with `middleware/validate.js`, not ad-hoc `if (!body.title)` in routes

## Security & data

- [ ] **RLS and migrations** — SQL under `docs/*-migration.sql` and `supabase/migrations/` is reviewed manually; CI does not prove RLS correctness
- [ ] **No permissive policies** — avoid `USING (true)` on user-owned tables without a documented reason
- [ ] **Share links / tokens** — must be server-generated, hashed at rest, scoped; no client-only “security”

## Code quality (slop patterns)

- [ ] **No duplicate helpers** — check `src/utils/` before adding date/status/format logic ([#24](https://github.com/Venkat-Kolasani/FutureStack/issues/24) pattern)
- [ ] **Reuses existing components** — cards, modals, empty states match Dashboard / list pages
- [ ] **No render-phase side effects** — `useEffect` / `useLayoutEffect` for fetch and auth wiring, not bare calls in component body ([#16](https://github.com/Venkat-Kolasani/FutureStack/issues/16))
- [ ] **No drive-by refactors** — diff stays within issue scope
- [ ] **No debug `console.log`** in routes (warned in CI for new lines)

## Tests & verification

- [ ] **Route changes include backend tests** — `backend/tests/integration/` or `unit/`
- [ ] **PR test plan is repeatable** — reviewer can follow steps without guessing
- [ ] **CI green** — frontend, backend, architecture jobs

## UI / UX

- [ ] **Works signed out and signed in** where relevant
- [ ] **Mobile layout** checked if UI changed
- [ ] **Loading and error states** — not only the happy path
- [ ] **Accessibility basics** — buttons are buttons, forms have labels, focus not trapped

## Process (GSSoC)

- [ ] **Issue assigned** before substantial work
- [ ] **One issue per PR** — `Fixes #N` in description
- [ ] **Dependencies respected** — migrations, validation, routes, API services, and UI land in a compatible order
- [ ] **Acceptance criteria met** — not a partial or unrelated “improvement”

## When to request changes vs close

| Request changes | Close / redirect |
|-----------------|------------------|
| Good approach, fixable gaps (tests, scope creep) | Wrong architecture (OTP login, frontend service role) |
| Missing tests on API changes | Duplicate PR or unassigned work |
| Minor style mismatches | Issue explicitly marked wontfix or out of phase |
