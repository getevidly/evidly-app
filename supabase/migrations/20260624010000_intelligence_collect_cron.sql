-- ══════════════════════════════════════════════════════════════════════════
-- 20260624010000_intelligence_collect_cron.sql
--
-- Enables the daily pg_cron job for intelligence-collect (37 API sources
-- → intelligence_signals). This function has been deployed and working
-- since March 2026 but was never scheduled — only manually invoked.
--
-- Schedule: daily at 14:00 UTC (6 am PT) — matches the original design
-- intent documented in migration 20260506100003.
--
-- Auth: Vault-based service_role_key (matches 20260809000000 pattern).
-- The function accepts service_role JWT at line 614-616 of index.ts.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Remove stale job if it exists (idempotent) ────────────────────────
SELECT cron.unschedule('intelligence-collect-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'intelligence-collect-daily'
);

-- ── 2. Schedule intelligence-collect daily at 6 am PT (14:00 UTC) ────────
SELECT cron.schedule(
  'intelligence-collect-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/intelligence-collect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);

-- ── 3. Update edge_function_registry to reflect cron trigger ─────────────
UPDATE edge_function_registry
SET trigger_type   = 'cron',
    cron_schedule  = '0 14 * * *',
    cron_job_name  = 'intelligence-collect-daily',
    updated_at     = now()
WHERE function_name = 'intelligence-collect';
