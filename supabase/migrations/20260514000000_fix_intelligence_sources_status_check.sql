-- FIX [TRIGGER-CRAWL-DISPLAY-01]: Expand intelligence_sources.status CHECK constraint
-- Original constraint: ('active','paused','waf_blocked','broken','pending')
-- Edge functions crawl-monitor and trigger-crawl write 'live' and 'error'
-- which violate the constraint — causing silent update failures.
-- Also adds 'timeout', 'degraded', 'disabled' for completeness.

-- Step 1: Drop the old constraint
ALTER TABLE intelligence_sources
  DROP CONSTRAINT IF EXISTS intelligence_sources_status_check;

-- Step 2: Add expanded constraint
ALTER TABLE intelligence_sources
  ADD CONSTRAINT intelligence_sources_status_check
  CHECK (status IN (
    'live',         -- crawl succeeded, source is reachable
    'error',        -- crawl failed (HTTP error, timeout, parse failure)
    'waf_blocked',  -- source returned WAF/CDN block page
    'timeout',      -- source timed out
    'degraded',     -- partial response or intermittent issues
    'pending',      -- never crawled / awaiting first crawl
    'disabled',     -- manually disabled by admin
    'paused',       -- temporarily paused
    'active',       -- legacy value (treated same as live)
    'broken'        -- legacy value (treated same as error)
  ));

-- Step 3: Migrate legacy values to new canonical values
UPDATE intelligence_sources SET status = 'live'  WHERE status = 'active';
UPDATE intelligence_sources SET status = 'error'  WHERE status = 'broken';

-- Step 4: Add fetch_method column if not exists (edge functions use this name)
-- The original migration used crawl_method; edge functions use fetch_method.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intelligence_sources' AND column_name = 'fetch_method'
  ) THEN
    ALTER TABLE intelligence_sources ADD COLUMN fetch_method TEXT;
    -- Populate from crawl_method
    UPDATE intelligence_sources SET fetch_method = crawl_method WHERE fetch_method IS NULL;
  END IF;
END $$;
