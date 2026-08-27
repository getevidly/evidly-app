-- Intelligence email digest — send log.
--
-- One row per (organization, signal) that has been emailed. The digest reads
-- this to exclude signals an org has already received, so a signal is emailed
-- exactly once per org no matter how often the weekly job runs.
--
-- Rows are written ONLY after Resend confirms the send. A failed send logs
-- nothing, so the signal is picked up again on the next run.

CREATE TABLE IF NOT EXISTS public.intelligence_digest_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL,
  signal_id        uuid NOT NULL,
  mode             text NOT NULL CHECK (mode IN ('full', 'teaser')),
  sent_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, signal_id)
);

CREATE INDEX IF NOT EXISTS idx_intelligence_digest_log_org
  ON public.intelligence_digest_log (organization_id, signal_id);

ALTER TABLE public.intelligence_digest_log ENABLE ROW LEVEL SECURITY;

-- ── RLS: house standard ────────────────────────────────────────────
DROP POLICY IF EXISTS "org_members_read_own" ON public.intelligence_digest_log;
CREATE POLICY "org_members_read_own" ON public.intelligence_digest_log
  FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role_all" ON public.intelligence_digest_log;
CREATE POLICY "service_role_all" ON public.intelligence_digest_log
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "platform_admin_all" ON public.intelligence_digest_log;
CREATE POLICY "platform_admin_all" ON public.intelligence_digest_log
  FOR ALL
  USING (is_platform_admin());

-- ── Weekly schedule: Monday 15:00 UTC ──────────────────────────────
-- Same registration pattern as pl-retention-purge (20261208000000):
-- vault secret 'service_role_key' supplies the bearer token.
DO $BODY$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'intelligence-digest-weekly') THEN
    PERFORM cron.unschedule('intelligence-digest-weekly');
  END IF;
  PERFORM cron.schedule(
    'intelligence-digest-weekly',
    '0 15 * * 1',
    $job$
    SELECT net.http_post(
        url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/intelligence-digest',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $job$
  );
END
$BODY$;
