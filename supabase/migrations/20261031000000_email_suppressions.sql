-- email_suppressions — one-click unsubscribe, keyed by email (not user_id).
-- Recipients may have no EvidLY account. Checked at send time in _shared/email.ts.
CREATE TABLE IF NOT EXISTS email_suppressions (
  email          TEXT PRIMARY KEY,
  reason         TEXT,
  source         TEXT,
  suppressed_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON email_suppressions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- unsub_token on county_briefing_recipients — token per recipient for one-click unsub link.
ALTER TABLE county_briefing_recipients
  ADD COLUMN IF NOT EXISTS unsub_token TEXT UNIQUE;

-- Backfill existing recipients with tokens.
UPDATE county_briefing_recipients
  SET unsub_token = gen_random_uuid()::text
  WHERE unsub_token IS NULL;

-- unsub_token on study_email_log — token per follow-up send for one-click unsub link.
ALTER TABLE study_email_log
  ADD COLUMN IF NOT EXISTS unsub_token TEXT UNIQUE;
