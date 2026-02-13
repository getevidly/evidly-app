-- ============================================================================
-- Migration: 20260220000000_onboarding_document_progress.sql
-- Description: Onboarding document checklist progress tracking.
--              Stores per-user, per-document-type upload status so the app
--              can show a completion checklist and trigger reminder emails
--              for incomplete onboarding.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. onboarding_document_progress
--    One row per required document type per user per organization.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_document_progress (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id  UUID        NOT NULL,
  location_id      UUID,
  document_type    TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'uploaded', 'not_applicable')),
  document_id      UUID,
  na_reason        TEXT,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, document_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_doc_progress_user
  ON onboarding_document_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_doc_progress_org
  ON onboarding_document_progress(organization_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_doc_progress_status
  ON onboarding_document_progress(status);

-- Row-Level Security
ALTER TABLE onboarding_document_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_document_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
  ON onboarding_document_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
  ON onboarding_document_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 2. Add onboarding tracking columns to user_profiles
-- --------------------------------------------------------------------------
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_progress INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_onboarding_reminder_sent TIMESTAMPTZ;

-- --------------------------------------------------------------------------
-- 3. Trigger: auto-update updated_at on row modification
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_onboarding_doc_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_onboarding_doc_progress_updated_at
  BEFORE UPDATE ON onboarding_document_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_doc_progress_updated_at();
