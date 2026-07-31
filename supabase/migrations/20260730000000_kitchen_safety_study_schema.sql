-- =============================================================================
-- Migration: kitchen_safety_study_schema
-- Purpose:   Migrate market_research_responses from the old 10-question CSAT
--            survey to the new Kitchen Safety Study instrument. Create two
--            child tables: market_research_answers and market_research_contacts.
--
-- The split is deliberate: an export of responses carries answers and no people.
-- PII lives only in market_research_contacts, written only on opt-in.
--
-- Apply: supabase db query --linked -f supabase/migrations/20260730000000_kitchen_safety_study_schema.sql
-- =============================================================================

BEGIN;

-- ── 1. Migrate market_research_responses ────────────────────────────────────

-- Drop old columns that do not map to the new instrument
ALTER TABLE market_research_responses
  DROP COLUMN IF EXISTS prospect_token,
  DROP COLUMN IF EXISTS org_name,
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS segment,
  DROP COLUMN IF EXISTS county_id,
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS record_locations,
  DROP COLUMN IF EXISTS due_discovery,
  DROP COLUMN IF EXISTS hardest_parts,
  DROP COLUMN IF EXISTS asked_by,
  DROP COLUMN IF EXISTS would_pay_for,
  DROP COLUMN IF EXISTS open_answer,
  DROP COLUMN IF EXISTS started_at;

-- Drop old indexes
DROP INDEX IF EXISTS idx_mrr_completed;
DROP INDEX IF EXISTS idx_mrr_segment;
DROP INDEX IF EXISTS idx_mrr_county;

-- Add new columns
ALTER TABLE market_research_responses
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status              TEXT DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS instrument_version  TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS source              TEXT,
  ADD COLUMN IF NOT EXISTS source_platform     TEXT,
  ADD COLUMN IF NOT EXISTS source_method       TEXT,
  ADD COLUMN IF NOT EXISTS scope               TEXT,
  ADD COLUMN IF NOT EXISTS county              TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_type        TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_count       TEXT,
  ADD COLUMN IF NOT EXISTS system              TEXT,
  ADD COLUMN IF NOT EXISTS record_owner        TEXT,
  ADD COLUMN IF NOT EXISTS speed               TEXT,
  ADD COLUMN IF NOT EXISTS askers              TEXT[],
  ADD COLUMN IF NOT EXISTS duration_seconds    INT,
  ADD COLUMN IF NOT EXISTS interviewer_id      TEXT;

-- completed_at already exists — ensure it is nullable
-- (no-op if already nullable, which it is)

-- Remove the gen_random_uuid() default so the client can supply its own id
ALTER TABLE market_research_responses
  ALTER COLUMN id DROP DEFAULT;

-- New indexes
CREATE INDEX IF NOT EXISTS idx_mrr_status ON market_research_responses(status);
CREATE INDEX IF NOT EXISTS idx_mrr_source ON market_research_responses(source);
CREATE INDEX IF NOT EXISTS idx_mrr_scope  ON market_research_responses(scope);
CREATE INDEX IF NOT EXISTS idx_mrr_county ON market_research_responses(county);
CREATE INDEX IF NOT EXISTS idx_mrr_completed ON market_research_responses(completed_at);

-- Drop old RLS policies (staff_read uses @getevidly.com which silently rejects
-- arthur@cprosplus.com — the actual platform_admin login)
DROP POLICY IF EXISTS "staff_read" ON market_research_responses;
DROP POLICY IF EXISTS "service_role_all" ON market_research_responses;
DROP POLICY IF EXISTS "platform_admin_all" ON market_research_responses;

-- New RLS policies
CREATE POLICY "service_role_all" ON market_research_responses FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "platform_admin_all" ON market_research_responses FOR ALL
  USING (is_platform_admin());


-- ── 2. Create market_research_answers ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_research_answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id  UUID NOT NULL REFERENCES market_research_responses(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL,
  value        TEXT NOT NULL,
  answered_at  TIMESTAMPTZ DEFAULT now()
);

-- One answer per question per response
CREATE UNIQUE INDEX IF NOT EXISTS idx_mra_response_question
  ON market_research_answers(response_id, question_id);

CREATE INDEX IF NOT EXISTS idx_mra_question_id
  ON market_research_answers(question_id);

ALTER TABLE market_research_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON market_research_answers FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "platform_admin_all" ON market_research_answers FOR ALL
  USING (is_platform_admin());


-- ── 3. Create market_research_contacts ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_research_contacts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id          UUID NOT NULL REFERENCES market_research_responses(id) ON DELETE CASCADE,
  email                TEXT,
  wants_findings       BOOLEAN DEFAULT false,
  wants_county_report  BOOLEAN DEFAULT false,
  wants_referral_link  BOOLEAN DEFAULT false,
  wants_meeting        BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mrc_response
  ON market_research_contacts(response_id);

CREATE INDEX IF NOT EXISTS idx_mrc_wants_meeting
  ON market_research_contacts(wants_meeting) WHERE wants_meeting = true;

ALTER TABLE market_research_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON market_research_contacts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "platform_admin_all" ON market_research_contacts FOR ALL
  USING (is_platform_admin());

COMMIT;
