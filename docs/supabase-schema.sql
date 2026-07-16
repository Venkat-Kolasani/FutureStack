-- =============================================================================
-- FutureTracker Database Schema for Supabase
-- Phase 1: Initial setup with Row Level Security (RLS)
-- =============================================================================

-- Users table (synced from Clerk on first login)
-- User profile rows will be created on first successful login via frontend.
-- In Phase 2, this can be moved to a backend webhook for better reliability.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can insert their own profile (for first login sync)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');


-- =============================================================================
-- Opportunities table
-- =============================================================================

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  deadline DATE,
  applied_on DATE,
  category TEXT CHECK (category IN ('internship', 'hackathon')),
  status TEXT CHECK (status IN ('applied', 'interviewed', 'shortlisted', 'selected', 'rejected', 'ghosted')),
  campus_mode TEXT CHECK (campus_mode IN ('on_campus', 'off_campus')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on opportunities table
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Users can only view their own opportunities
CREATE POLICY "Users can view own opportunities" ON opportunities
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Users can create their own opportunities
CREATE POLICY "Users can create own opportunities" ON opportunities
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Users can update their own opportunities
CREATE POLICY "Users can update own opportunities" ON opportunities
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Users can delete their own opportunities
CREATE POLICY "Users can delete own opportunities" ON opportunities
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
  );


-- =============================================================================
-- Index for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);


-- =============================================================================
-- Updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to opportunities table  
DROP TRIGGER IF EXISTS update_opportunities_updated_at ON opportunities;
CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- Documents Feature (Phase 1.3)
-- =============================================================================
-- For documents table, opportunity_documents junction table, and related
-- RLS policies, indexes, and triggers, see: docs/documents-migration.sql

-- =============================================================================
-- Interview Rounds (internship application pipeline)
-- =============================================================================
-- For opportunity_rounds table, opportunity round columns, RLS, and indexes,
-- see: docs/opportunity-rounds-migration.sql
