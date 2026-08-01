-- outreach_steps — step definitions for the county briefing outreach flow.
-- Each step has its own sign-off gate: editing copy clears sign-off (content_hash mismatch).
-- Steps default to unsigned. A missing sign-off is never treated as permission.
CREATE TABLE IF NOT EXISTS outreach_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number       INTEGER NOT NULL,
  label             TEXT NOT NULL,
  delay_days        INTEGER NOT NULL DEFAULT 0,
  trigger_type      TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'auto')),
  variant_scope     TEXT NOT NULL DEFAULT 'both' CHECK (variant_scope IN ('cold', 'warm', 'both')),
  subject_template  TEXT NOT NULL DEFAULT '',
  body_template     TEXT NOT NULL DEFAULT '',
  content_hash      TEXT NOT NULL DEFAULT '',
  signed_off_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_off_at     TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(step_number)
);

ALTER TABLE outreach_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON outreach_steps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY platform_admin_read ON outreach_steps
  FOR SELECT TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'platform_admin'
  );

CREATE INDEX idx_os_step_number ON outreach_steps(step_number);

-- Extend county_briefing_recipients with step tracking.
-- Defaults to 1 so existing rows are step 1 (county briefing).
ALTER TABLE county_briefing_recipients
  ADD COLUMN IF NOT EXISTS step_number INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_cbr_step ON county_briefing_recipients(step_number);

-- Register pg_cron job: county-outreach-process, daily at 14:00 UTC.
-- Calls the county-briefing edge function with action = 'cron-process'.
-- The function surfaces skip reasons on every ineligible row.
DO $BODY$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'county-outreach-process') THEN
    PERFORM cron.unschedule('county-outreach-process');
  END IF;
  PERFORM cron.schedule(
    'county-outreach-process',
    '0 14 * * 1-5',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/county-briefing',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{"action":"cron-process"}'::jsonb
    );
    $job$
  );
END
$BODY$;
