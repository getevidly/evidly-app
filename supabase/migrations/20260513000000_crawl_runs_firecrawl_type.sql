-- Expand crawl_runs.run_type CHECK to include 'firecrawl'
-- trigger-crawl edge function logs runs with run_type='firecrawl'

ALTER TABLE crawl_runs DROP CONSTRAINT IF EXISTS crawl_runs_run_type_check;
ALTER TABLE crawl_runs ADD CONSTRAINT crawl_runs_run_type_check
  CHECK (run_type IN ('scheduled', 'manual', 'retry', 'firecrawl'));
