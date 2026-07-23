-- =====================================================================
-- Migration: Add escalation_deadline + escalated_at to notifications
-- Timestamp: 20260711000000
--
-- Enables drift alert escalation: unacknowledged notifications past
-- their deadline trigger escalation to the next role tier.
-- =====================================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS escalation_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- Partial index for the escalation cron: find unacked, unescalated
-- notifications past their deadline.
CREATE INDEX IF NOT EXISTS idx_notifications_escalation_pending
  ON notifications (escalation_deadline)
  WHERE escalation_deadline IS NOT NULL
    AND acknowledged_at IS NULL
    AND escalated_at IS NULL;

COMMENT ON COLUMN notifications.escalation_deadline IS
  'Deadline for acknowledgment before escalation to next role tier.';
COMMENT ON COLUMN notifications.escalated_at IS
  'Timestamp when escalation was triggered for this notification.';
