-- =============================================================================
-- FutureTracker Interview Rounds Migration
-- Multi-round application pipeline tracking (internships only)
-- =============================================================================

-- Round types: resume_shortlisted, oa, assignment, technical_assignment, technical, hr, ...
-- Results: pending, cleared, rejected, skipped

CREATE TABLE IF NOT EXISTS opportunity_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number >= 1),
  round_type TEXT NOT NULL CHECK (round_type IN (
    'resume_shortlisted',
    'oa',
    'assignment',
    'technical_assignment',
    'technical',
    'hr',
    'group_discussion',
    'managerial',
    'final',
    'other'
  )),
  scheduled_date DATE,
  scheduled_time TIME,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN (
    'pending',
    'cleared',
    'rejected',
    'skipped'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (opportunity_id, round_number)
);

ALTER TABLE opportunity_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own opportunity_rounds" ON opportunity_rounds
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can create own opportunity_rounds" ON opportunity_rounds
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    AND opportunity_id IN (
      SELECT id FROM opportunities
      WHERE user_id = opportunity_rounds.user_id
        AND category = 'internship'
    )
  );

CREATE POLICY "Users can update own opportunity_rounds" ON opportunity_rounds
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can delete own opportunity_rounds" ON opportunity_rounds
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Quick-display fields on opportunities (status remains the kanban/analytics source of truth)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS current_round_number INTEGER,
  ADD COLUMN IF NOT EXISTS rejected_round_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_opportunity_rounds_opportunity_id
  ON opportunity_rounds(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_rounds_user_id
  ON opportunity_rounds(user_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_rounds_scheduled_date
  ON opportunity_rounds(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_opportunity_rounds_upcoming
  ON opportunity_rounds(user_id, scheduled_date, scheduled_time)
  WHERE result = 'pending' AND scheduled_date IS NOT NULL;

DROP TRIGGER IF EXISTS update_opportunity_rounds_updated_at ON opportunity_rounds;
CREATE TRIGGER update_opportunity_rounds_updated_at
  BEFORE UPDATE ON opportunity_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
