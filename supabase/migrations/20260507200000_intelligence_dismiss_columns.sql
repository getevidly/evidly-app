-- Add dismiss tracking columns to intelligence_signals
-- Supports undo/restore of dismissed signals with audit trail

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS dismissed_reason text,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_by text;

-- Index for quick dismissed signal lookups
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_dismissed
  ON intelligence_signals (status)
  WHERE status = 'dismissed';

COMMENT ON COLUMN intelligence_signals.dismissed_reason IS 'Reason for dismissal — required when dismissing a signal';
COMMENT ON COLUMN intelligence_signals.dismissed_at IS 'Timestamp when the signal was dismissed';
COMMENT ON COLUMN intelligence_signals.dismissed_by IS 'Email of the admin who dismissed the signal';
