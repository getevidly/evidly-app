-- ============================================================================
-- SERVICE-ALERT-LOG — PPP Prove audit trail for vendor service alerts
-- + Performance index on location_service_schedules for daily cron scan
-- + Reschedule cron to 13:00 UTC (06:00 PT summer / 05:00 PT winter)
-- ============================================================================

-- ── 1. service_alert_log table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_alert_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schedule_id       UUID NOT NULL REFERENCES location_service_schedules(id) ON DELETE CASCADE,
  severity          TEXT NOT NULL CHECK (severity IN ('overdue','due_soon','vendor_lapse')),
  days_overdue      INTEGER NOT NULL,
  recipient_type    TEXT NOT NULL CHECK (recipient_type IN ('operator_in_app','operator_email','vendor_email')),
  recipient_address TEXT,
  recipient_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  send_status       TEXT NOT NULL CHECK (send_status IN ('sent','failed','skipped_dedup')),
  error_message     TEXT,
  notification_id   UUID,
  thread_id         UUID,
  message_id        UUID,
  fired_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedupe lookup: most recent fire per (schedule, severity)
CREATE INDEX IF NOT EXISTS idx_service_alert_log_dedup
  ON service_alert_log (schedule_id, severity, fired_at DESC);

-- Org-scoped audit queries
CREATE INDEX IF NOT EXISTS idx_service_alert_log_org
  ON service_alert_log (organization_id, fired_at DESC);

-- User-specific lookups
CREATE INDEX IF NOT EXISTS idx_service_alert_log_user
  ON service_alert_log (recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

-- RLS: append-only audit log
ALTER TABLE service_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view service alert logs"
  ON service_alert_log FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert service alert logs"
  ON service_alert_log FOR INSERT TO service_role
  WITH CHECK (true);

-- ── 2. Performance index on location_service_schedules for cron scan ────────

CREATE INDEX IF NOT EXISTS idx_lss_active_next_due
  ON location_service_schedules (next_due_date)
  WHERE is_active = true AND next_due_date IS NOT NULL;

-- ── 3. Reschedule cron job ──────────────────────────────────────────────────
-- Remove old deferred M13 job if it was applied (0 2 * * *)
SELECT cron.unschedule('vendor-service-record-trigger')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'vendor-service-record-trigger'
);

-- Remove new job name if re-running migration (idempotent)
SELECT cron.unschedule('vendor-service-record-trigger-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'vendor-service-record-trigger-daily'
);

-- Schedule at 13:00 UTC daily (06:00 PT summer / 05:00 PT winter)
-- Year-round fixed UTC — ±1 hour DST perception drift acceptable
SELECT cron.schedule(
  'vendor-service-record-trigger-daily',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/vendor-service-record-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);
