-- ═══════════════════════════════════════════════════════════════════════
-- Add jurisdiction_id to county_briefing_recipients
--
-- Why: county TEXT alone is ambiguous when multiple jurisdiction rows
-- share a county name (e.g. Los Angeles has county + Long Beach +
-- Pasadena + Vernon). jurisdiction_id pins each recipient to the
-- exact county-level jurisdiction row used for the briefing.
--
-- The existing county TEXT column stays — it is the display token used
-- in subject lines and the County review panel.
--
-- Backfill: match each recipient's county to the jurisdiction row
-- where state='CA', is_active=true, preferring the county-level row
-- (city IS NULL) but falling back to a city row when that is all
-- there is (e.g. San Francisco consolidated city-county).
-- Rows whose county name has no matching jurisdiction will remain NULL.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Add the column (nullable, FK to jurisdictions)
ALTER TABLE county_briefing_recipients
  ADD COLUMN IF NOT EXISTS jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE SET NULL;

-- 2. Backfill — pick the best jurisdiction per county via ORDER BY city NULLS FIRST
UPDATE county_briefing_recipients r
SET jurisdiction_id = (
  SELECT j.id
  FROM jurisdictions j
  WHERE j.county = r.county
    AND j.state = 'CA'
    AND j.is_active = true
  ORDER BY j.city NULLS FIRST
  LIMIT 1
)
WHERE r.jurisdiction_id IS NULL;

-- 3. Index for FK lookups and joins
CREATE INDEX IF NOT EXISTS idx_cbr_jurisdiction
  ON county_briefing_recipients(jurisdiction_id);
