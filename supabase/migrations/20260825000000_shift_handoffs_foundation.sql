-- ============================================================================
-- SHIFT HANDOFFS FOUNDATION
-- ALTER existing shift_handoffs table (created in 20260604000000) to add
-- columns needed for Commit 2 (Handoff View Wire).
-- ============================================================================

-- ── 1. Add columns ─────────────────────────────────────────────────────────
ALTER TABLE shift_handoffs ADD COLUMN IF NOT EXISTS
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE shift_handoffs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE shift_handoffs ADD COLUMN IF NOT EXISTS stats_snapshot JSONB;

-- ── 2. Backfill organization_id from location join ─────────────────────────
UPDATE shift_handoffs sh
SET organization_id = l.organization_id
FROM locations l
WHERE sh.location_id = l.id
  AND sh.organization_id IS NULL;

-- Report orphan count and conditionally add NOT NULL
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM shift_handoffs
  WHERE organization_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'shift_handoffs: % orphan rows with NULL organization_id (location_id has no matching location)', orphan_count;
  END IF;

  IF orphan_count = 0 THEN
    ALTER TABLE shift_handoffs ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- ── 3. Performance indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_location_date
  ON shift_handoffs (location_id, shift_date DESC);

CREATE INDEX IF NOT EXISTS idx_shift_handoffs_org
  ON shift_handoffs (organization_id, shift_date DESC)
  WHERE organization_id IS NOT NULL;
