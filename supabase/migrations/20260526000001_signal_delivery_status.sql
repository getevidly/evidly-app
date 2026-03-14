-- AUDIT-FIX-05 / P-1: Delivery status tracking for intelligence signals
-- Replaces fire-and-forget delivery with observable status.

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending'
  CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'partial'));

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS delivery_error text;

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS delivery_attempt_count integer DEFAULT 0;

-- Index for admin queries filtering by delivery status
CREATE INDEX IF NOT EXISTS idx_signals_delivery_status
  ON intelligence_signals(delivery_status, is_published)
  WHERE is_published = true;
