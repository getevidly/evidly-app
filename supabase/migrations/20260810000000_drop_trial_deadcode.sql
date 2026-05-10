-- Sprint A: Trial dead-code cleanup (partial)
-- Drops 2 unused DB artifacts: trial-email-daily cron job, trial_email_log table.
-- Both confirmed unused as of 2026-05-09: cron job orphaned/broken GUC/0 sends, table 0 rows, no FK deps.
-- Companion code changes: deletion of supabase/functions/trial-email-sender/ and removal of trial_email_log references in resend-webhook/index.ts.
-- DEFERRED: set_trial_end_date() function + trg_set_trial_end_date trigger on organizations. Pending audit of trial_*_date column readers (Stripe/Accept.blue downstream).

-- 1. Unschedule trial-email-daily cron job (conditional to allow re-run)
DO $job$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-email-daily') THEN
    PERFORM cron.unschedule('trial-email-daily');
  END IF;
END
$job$;

-- 2. Drop trial_email_log table (0 rows, no FK deps confirmed)
DROP TABLE IF EXISTS public.trial_email_log;
