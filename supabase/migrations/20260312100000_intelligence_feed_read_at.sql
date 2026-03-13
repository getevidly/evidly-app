-- INTELLIGENCE-PIPELINE-ALIGN-01: Add read_at timestamp to client_intelligence_feed
-- is_read boolean already exists (default false); this adds the timestamp for tracking

ALTER TABLE client_intelligence_feed
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
