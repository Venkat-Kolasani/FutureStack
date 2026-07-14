# Contributing to FutureStack

Thank you for contributing to FutureStack through **GirlScript Summer of Code (GSSoC) 2026** and the wider open-source community.

## Before you start

1. Read the [README](README.md) and **[docs/CODEBASE_GUIDE.md](docs/CODEBASE_GUIDE.md)** for architecture and file orientation.
2. Check [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md), then skim the feature documentation for your area.
3. Pick **one open issue** you want to work on.
4. **Do not open a PR** until a maintainer has assigned the issue to you.
5. Comment on the issue with your approach (see below). Wait for assignment before coding.

## How to get an issue assigned

Comment on the issue with:

- **What you plan to change** — concrete behavior, not vague goals
- **Files you expect to touch** — list paths (e.g. `src/utils/dateHelpers.js`, `OpportunityCard.jsx`)
- **Libraries or patterns** — only if adding something new; prefer existing stack (React, Tailwind, Express, Supabase)
- **Test plan** — how you will verify it works locally
- **Dependencies** — call out any migration, API, or UI work that must land first.

**Example:**

> I'll add `getDeadlineUrgency()` in `src/utils/dateHelpers.js` and use it in `OpportunityCard.jsx` and `DeadlineWidget.jsx`. No new libraries. I'll test with deadlines today, in 2 days, in 10 days, and expired.

Maintainers assign **one contributor per issue**. Assignment usually comes with a **7-day deadline** to open a draft or final PR.

## Development setup

```bash
git clone https://github.com/Venkat-Kolasani/FutureStack.git
cd FutureStack
npm install
cd backend && npm install && cd ..

# Terminal 1 — backend (port 3001)
cd backend && npm run dev

# Terminal 2 — frontend (port 3000)
npm start
```

Copy `.env.example` and `backend/.env.example` to `.env` files and fill in Clerk + Supabase credentials. See the README **Environment Variables** section.

## Pull request rules

- **One issue per PR** — no unrelated refactors or drive-by fixes
- **Reference the issue** — use `Fixes #123` in the PR description
- **Keep scope small** — if the issue grows, discuss with maintainers before expanding
- **Match existing style** — same component patterns, Tailwind tokens, error handling, and file layout
- **No secrets** — never commit `.env`, API keys, or service role keys
- **Database changes** — add SQL migration files under `docs/` (see existing `*-migration.sql` files)

### Before you request review

See **[docs/TESTING.md](docs/TESTING.md)** for the full command list and smoke checklist.

```bash
npm run test:ci
cd backend && npm test && cd ..
npm run check:architecture
```

**Rules:**

- **Route or validation changes** require tests in `backend/tests/` — CI will run them on every PR.
- **No direct Supabase CRUD from the frontend** — use the Express API; `npm run check:architecture` enforces this.
- Manual smoke test: sign in, open the page(s) you changed, test happy path + one edge case.

If you changed backend routes without adding tests, request review only after adding coverage for the behavior you changed.

## What we look for in reviews

| ✅ Good | ❌ Will be rejected |
|--------|---------------------|
| Solves the issue acceptance criteria | UI-only change that doesn't meet criteria |
| Reuses existing helpers and components | Duplicates logic already in the codebase |
| Tested locally with clear steps | Copy-paste boilerplate with no testing |
| Minimal, focused diff | Large unrelated changes |
| Respects auth, RLS, and validation | Bypasses API or exposes user data |

## Dependencies and product state

Share links and theming are already implemented. Do not recreate them from older issue plans; extend the existing services and components instead. The AI Resume Checker backend is present but its user interface is feature-gated, so work that exposes it must explicitly include rollout and security considerations. Check the project-status document and the relevant migration before proposing schema work.

## Labels (for maintainers & contributors)

| Label | Meaning |
|-------|---------|
| `gssoc` | GSSoC 2026 contribution |
| `good first issue` | Smaller scope, good for first PR |
| `enhancement` | New feature |
| `bug` | Fix broken behavior |
| `frontend` / `backend` / `fullstack` | Primary area |

## Code of conduct

Be respectful in issues and PRs. Maintainers may unassign or close work that ignores scope, duplicates another assignee's PR, or violates project security practices.

## Questions?

Open a comment on the relevant issue and tag `@Venkat-Kolasani`. For architecture questions, check [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) first.
