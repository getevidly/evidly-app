-- Add per-source crawl result tracking columns to intelligence_sources
-- last_crawl_status tracks the outcome of the most recent crawl attempt
-- last_crawl_error stores error details when a crawl fails

ALTER TABLE intelligence_sources
  ADD COLUMN IF NOT EXISTS last_crawl_status text CHECK (last_crawl_status IN ('success','error','pending')),
  ADD COLUMN IF NOT EXISTS last_crawl_error  text;

CREATE INDEX IF NOT EXISTS idx_intel_sources_crawl_status
  ON intelligence_sources(last_crawl_status);
