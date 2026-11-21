-- Interview prep focus columns, exam flag, and one encrypted key per AI provider.
-- Creates the prep tables when this database has not run the earlier manual SQL.

CREATE TABLE IF NOT EXISTS interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  company_research TEXT,
  reflection_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prep_id UUID REFERENCES interview_prep(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_prepared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS technical_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prep_id UUID REFERENCES interview_prep(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  priority_order INTEGER DEFAULT 2,
  is_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS behavioral_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prep_id UUID REFERENCES interview_prep(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  situation TEXT,
  task TEXT,
  action TEXT,
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_prep ENABLE ROW LEVEL SECURITY;

ALTER TABLE interview_questions
  ADD COLUMN IF NOT EXISTS focus TEXT,
  ADD COLUMN IF NOT EXISTS is_exam BOOLEAN DEFAULT FALSE;

ALTER TABLE technical_topics
  ADD COLUMN IF NOT EXISTS focus TEXT;

ALTER TABLE behavioral_prep
  ADD COLUMN IF NOT EXISTS focus TEXT;

ALTER TABLE interview_questions DROP CONSTRAINT IF EXISTS interview_questions_focus_check;
ALTER TABLE interview_questions
  ADD CONSTRAINT interview_questions_focus_check
  CHECK (focus IS NULL OR focus IN ('oa', 'technical', 'behavioral', 'assignment', 'general'));

ALTER TABLE technical_topics DROP CONSTRAINT IF EXISTS technical_topics_focus_check;
ALTER TABLE technical_topics
  ADD CONSTRAINT technical_topics_focus_check
  CHECK (focus IS NULL OR focus IN ('oa', 'technical', 'behavioral', 'assignment', 'general'));

ALTER TABLE behavioral_prep DROP CONSTRAINT IF EXISTS behavioral_prep_focus_check;
ALTER TABLE behavioral_prep
  ADD CONSTRAINT behavioral_prep_focus_check
  CHECK (focus IS NULL OR focus IN ('oa', 'technical', 'behavioral', 'assignment', 'general'));

ALTER TABLE user_ai_settings DROP CONSTRAINT IF EXISTS user_ai_settings_pkey;
ALTER TABLE user_ai_settings DROP CONSTRAINT IF EXISTS user_ai_settings_provider_check;
ALTER TABLE user_ai_settings
  ADD CONSTRAINT user_ai_settings_provider_check
  CHECK (provider IN ('gemini', 'ollama', 'groq', 'anthropic'));
ALTER TABLE user_ai_settings ADD PRIMARY KEY (user_id, provider);
