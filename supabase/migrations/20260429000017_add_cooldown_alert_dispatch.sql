-- Add cooldown_alert_dispatch audit table.
-- Server-side audit log for every cooldown alert that gets fanned out via
-- the cooldown alert Edge Function. Per locked decision: alerts hit
-- primary + secondary + manager + owner simultaneously on first risk
-- detection (no escalation lag). SMS + email + push fire as configured
-- per recipient's notification_preferences. Edge Function fires regardless
-- of login state.
--
-- Audit-leaning: SELECT policy only (users can read alerts for their own
-- locations). Writes happen via the Edge Function with service-role
-- privileges, bypassing RLS. No INSERT/UPDATE/DELETE policies needed —
-- audit rows are immutable for compliance.

CREATE TYPE cooldown_alert_method AS ENUM ('sms', 'email', 'push');
CREATE TYPE cooldown_alert_outcome AS ENUM ('queued', 'sent', 'delivered', 'failed', 'acknowledged');

CREATE TABLE cooldown_alert_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooldown_log_id uuid NOT NULL REFERENCES cooldown_logs(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  recipient_role text NOT NULL CHECK (recipient_role IN ('primary','secondary','manager','owner')),
  method cooldown_alert_method NOT NULL,
  destination text NOT NULL,
  outcome cooldown_alert_outcome NOT NULL DEFAULT 'queued',
  trigger_reason text NOT NULL,
  trigger_temperature decimal,
  trigger_stage smallint,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  failure_reason text,
  external_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cooldown_alert_dispatch_cooldown_log_id ON cooldown_alert_dispatch(cooldown_log_id);
CREATE INDEX idx_cooldown_alert_dispatch_recipient_user_id ON cooldown_alert_dispatch(recipient_user_id);
CREATE INDEX idx_cooldown_alert_dispatch_dispatched_at ON cooldown_alert_dispatch(dispatched_at DESC);

ALTER TABLE cooldown_alert_dispatch ENABLE ROW LEVEL SECURITY;

CREATE POLICY cooldown_alert_dispatch_select ON cooldown_alert_dispatch FOR SELECT
  USING (cooldown_log_id IN (
    SELECT id FROM cooldown_logs WHERE location_id IN (
      SELECT location_id FROM user_location_access WHERE user_id = auth.uid())));
