-- =============================================================================
-- FutureTracker User Profile Feature Migration
-- Issue #35: Add User Profile Management Section
-- =============================================================================

-- =============================================================================
-- User Profiles Table
-- Stores application-specific profile data (academic and professional info)
-- Note: Authentication and account data remain in Clerk
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Basic Information (profile picture URL for v1; actual upload in Phase 2)
  bio TEXT,
  avatar_url TEXT,
  
  -- Academic Information
  college TEXT,
  degree TEXT,
  graduation_year INTEGER,
  
  -- Professional Information
  skills TEXT,                          -- Comma-separated text for simplicity
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_graduation_year CHECK (
    graduation_year IS NULL OR (graduation_year >= 1950 AND graduation_year <= 2100)
  )
);

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Users can create their own profile
CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Users can delete their own profile (cascade from users table)
-- No separate delete policy needed as users table cascade handles this


-- =============================================================================
-- Indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);


-- =============================================================================
-- Updated_at trigger for user_profiles
-- =============================================================================

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- Notes for developers
-- =============================================================================

-- Field ownership:
--   Clerk-managed (read-only from Clerk): email, name, profile picture
--   Stored in user_profiles: bio, college, degree, graduation_year, skills, 
--                            github_url, linkedin_url, portfolio_url, avatar_url
--
-- Profile picture upload (Phase 2):
--   Will follow documents/storage pattern from backend/src/routes/documents.js
--   For now, avatar_url is a simple text field for external URL