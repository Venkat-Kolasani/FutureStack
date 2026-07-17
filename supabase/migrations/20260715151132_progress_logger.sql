-- =============================================================================
-- FutureTracker Progress Logger
-- Tracks, daily logs, indexes, and Clerk-compatible Row-Level Security policies
-- =============================================================================
--
-- FutureTracker uses Clerk identities mapped to public.users, not Supabase Auth
-- identities. These foreign keys and policies therefore follow the existing
-- application convention: rows belong to public.users(id), and direct database
-- access is constrained through the Clerk subject in request JWT claims.
--

-- =============================================================================
-- Progress tracks
-- =============================================================================

CREATE TABLE IF NOT EXISTS progress_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (
    template_type IN ('leetcode', 'dev', 'system_design', 'mock', 'reading', 'custom')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT progress_tracks_id_user_id_key UNIQUE (id, user_id)
);

-- =============================================================================
-- Progress logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  did_log BOOLEAN NOT NULL DEFAULT false,
  what_did_you_do TEXT,
  what_did_you_learn TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  mood TEXT CHECK (mood IN ('easy', 'moderate', 'hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track_id, log_date),
  CONSTRAINT progress_logs_track_user_fkey
    FOREIGN KEY (track_id, user_id)
    REFERENCES progress_tracks(id, user_id)
    ON DELETE CASCADE
);

-- The heatmap reads a user's logs by day; track history reads logs by track.
CREATE INDEX IF NOT EXISTS idx_progress_logs_user_date
  ON progress_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_progress_logs_track_id
  ON progress_logs(track_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracks_user_id
  ON progress_tracks(user_id);

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE progress_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- Policies are idempotent so the migration can be reapplied safely while
-- developing a fresh database. WITH CHECK prevents inserts or updates that
-- attempt to move a row to another user.
DROP POLICY IF EXISTS "Users manage own progress tracks" ON progress_tracks;
CREATE POLICY "Users manage own progress tracks" ON progress_tracks
  FOR ALL
  USING (
    user_id IN (
      SELECT id
      FROM users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id
      FROM users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

DROP POLICY IF EXISTS "Users manage own progress logs" ON progress_logs;
CREATE POLICY "Users manage own progress logs" ON progress_logs
  FOR ALL
  USING (
    user_id IN (
      SELECT id
      FROM users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id
      FROM users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );
