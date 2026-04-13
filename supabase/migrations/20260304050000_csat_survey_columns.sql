-- CSAT Survey System — Add survey tracking columns to support_tickets
-- csat_token: unique URL token for public survey link
-- csat_sent_at: timestamp when CSAT email was sent
-- csat_comment: optional free-text feedback from customer
-- csat_completed_at: timestamp when customer submitted their rating

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS csat_token      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS csat_sent_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS csat_comment    TEXT,
  ADD COLUMN IF NOT EXISTS csat_completed_at TIMESTAMPTZ;

-- Index for public survey page lookup by token
CREATE INDEX IF NOT EXISTS idx_support_tickets_csat_token
  ON support_tickets (csat_token)
  WHERE csat_token IS NOT NULL;

-- RLS: Allow anonymous read/update by csat_token for survey submission
-- (The survey page is public — no auth required)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_csat_survey_read' AND tablename = 'support_tickets') THEN
    CREATE POLICY "anon_csat_survey_read" ON support_tickets FOR SELECT TO anon USING (csat_token IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_csat_survey_update' AND tablename = 'support_tickets') THEN
    CREATE POLICY "anon_csat_survey_update" ON support_tickets FOR UPDATE TO anon USING (csat_token IS NOT NULL) WITH CHECK (csat_token IS NOT NULL);
  END IF;
END $$;
