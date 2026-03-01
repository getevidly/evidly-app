-- ============================================================================
-- KITCHEN-CHECKUP-6A: Internal Kitchen Checkup questionnaire tables
-- ============================================================================
-- Self-assessment tool for authenticated users — 20 questions across
-- Food Safety and Facility Safety pillars with simple percentage scoring.

CREATE TABLE IF NOT EXISTS kitchen_checkups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  facility_id UUID,
  food_safety_score NUMERIC(5,2),
  facility_safety_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  grade TEXT CHECK (grade IN ('A','B','C','D','F')),
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kitchen_checkup_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_id UUID NOT NULL REFERENCES kitchen_checkups(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  pillar TEXT CHECK (pillar IN ('food_safety','facility_safety')),
  answer TEXT CHECK (answer IN ('yes','mostly','no','na')),
  points_earned INTEGER,
  points_possible INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kitchen_checkups_user ON kitchen_checkups(user_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_checkup_responses_checkup ON kitchen_checkup_responses(checkup_id);

-- RLS
ALTER TABLE kitchen_checkups ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_checkup_responses ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own checkups
CREATE POLICY "Users can insert own checkups"
  ON kitchen_checkups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own checkups"
  ON kitchen_checkups FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
  ON kitchen_checkup_responses FOR INSERT TO authenticated
  WITH CHECK (
    checkup_id IN (SELECT id FROM kitchen_checkups WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can read own responses"
  ON kitchen_checkup_responses FOR SELECT TO authenticated
  USING (
    checkup_id IN (SELECT id FROM kitchen_checkups WHERE user_id = auth.uid())
  );

-- Service role has full access
CREATE POLICY "Service role full access checkups"
  ON kitchen_checkups FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access responses"
  ON kitchen_checkup_responses FOR ALL TO service_role
  USING (true) WITH CHECK (true);
