# Dashboard Share Links

FutureStack supports opt-in, read-only opportunity sharing through unique links at `/share/:token`.

## User Flow

1. The signed-in owner opens `/dashboard` and clicks **Share Dashboard**.
2. The owner selects all opportunities or specific opportunities.
3. The owner chooses visible fields: status, description, deadline, application link, interview round stage, and date applied.
4. The owner chooses an expiry: 24 hours, 7 days, or permanent.
5. The owner can optionally require a 4-digit passcode.
6. The API returns the raw link immediately and stores an encrypted copy so the owner can copy it again later.
7. Viewers open `/share/:token` without signing in.

## Privacy Model

Share links expose a frozen, redacted snapshot only. Public responses never include:

- `user_id`
- owner name or email
- opportunity notes
- documents or file URLs
- interview prep data
- raw token or token hash
- passcode hash or salt

Public snapshots can include safe opportunity fields the owner chooses: title, category, status, description, deadline, original application link, date applied, and round stage numbers.

Tokens are generated server-side and stored as `token_hash` for public lookup. The raw token is also encrypted with AES-256-GCM into `token_ciphertext`, `token_iv`, and `token_auth_tag` so owners can copy active links again from the dashboard. Set `SHARE_LINK_ENCRYPTION_KEY` in the backend environment; if it is missing, the backend derives a key from `SUPABASE_SERVICE_ROLE_KEY` as a compatibility fallback. Optional passcodes are salted and hashed server-side. Public pages call the Express API, not Supabase directly, so token lookup, expiry, revocation, passcode checks, and view-count increments stay server-enforced.

## Data Model

Migration files:

- `docs/share-links-migration.sql`
- `supabase/migrations/20260624163000_create_share_links.sql`
- `supabase/migrations/20260624171000_add_recoverable_share_tokens.sql`

Table: `share_links`

| Column | Purpose |
|--------|---------|
| `id` | Share row ID |
| `user_id` | Owner, references `users(id)` |
| `token_hash` | Unique SHA-256 hash of raw share token |
| `token_ciphertext`, `token_iv`, `token_auth_tag` | Encrypted raw token for owner-side re-copy |
| `snapshot` | Frozen redacted opportunity payload |
| `snapshot_type` | `frozen` now, `live` reserved for future work |
| `expires_at` | Nullable expiry |
| `is_active` | Revoke flag |
| `view_count` | Public successful views |
| `passcode_hash`, `passcode_salt` | Optional passcode protection |

RLS is enabled with owner-only authenticated policies. Public viewing is handled by backend routes with the service role; do not add permissive public policies on `opportunities`.

## API Routes

Protected routes:

- `GET /api/v1/share-links` — list current user share metadata and copyable URLs when available.
- `POST /api/v1/share-links` — create a share and return the raw URL once.
- `DELETE /api/v1/share-links/:id` — revoke a share.

Public routes:

- `GET /api/v1/public/share-links/:token` — fetch public snapshot, or return passcode-required / revoked / expired state.
- `POST /api/v1/public/share-links/:token/verify` — verify passcode and return public snapshot.

## Manual Verification

Run automated checks first:

```bash
npm run test:ci
npm run build
cd backend && npm test && cd ..
npm run check:architecture
```

Then smoke test:

1. Start backend and frontend locally.
2. Sign in and add several opportunities with descriptions, deadlines, and application links.
3. Open `/dashboard`, generate a share link for all opportunities, and copy the URL.
4. Open the URL in a signed-out or private browser session.
5. Confirm viewers can see opportunity details, deadlines, and click **Apply / Open opportunity**.
6. Refresh the public URL multiple times; it should remain accessible while active.
7. Copy the same URL again from **Active Share Links**.
8. Generate a passcode-protected share and verify wrong and correct passcodes.
9. Revoke a share from the dashboard and confirm the public URL shows the expired/revoked page.
10. Check mobile layout for the modal, manage panel, passcode gate, and public opportunity cards.
