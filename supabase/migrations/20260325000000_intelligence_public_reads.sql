-- INTEL-PUBLIC-READS-1: Allow public reads of unowned intelligence insights
--
-- Pipeline items and demo seed data have organization_id IS NULL.
-- The original RLS only allowed reading published+demo_eligible rows,
-- which blocked 42 of 43 real pipeline items (pending_review status).
--
-- This migration adds a permissive policy so anon/authenticated users
-- can read any intelligence_insights row where organization_id IS NULL
-- (demo/pipeline items that aren't assigned to a specific org).

-- Ensure organization_id column exists (may be missing if table was created before migration 20260314)
DO $$ BEGIN
  ALTER TABLE intelligence_insights ADD COLUMN IF NOT EXISTS organization_id UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE executive_snapshots ADD COLUMN IF NOT EXISTS organization_id UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop the overly restrictive demo-only policy
DROP POLICY IF EXISTS "Anyone can read published demo-eligible insights" ON intelligence_insights;

-- Replace with: anyone can read unowned insights (any status)
DO $$ BEGIN
  CREATE POLICY "Anyone can read unowned intelligence insights"
    ON intelligence_insights FOR SELECT
    TO anon, authenticated
    USING (organization_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Also allow reading unowned executive snapshots (any status)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read published demo-eligible snapshots" ON executive_snapshots;
  CREATE POLICY "Anyone can read unowned executive snapshots"
    ON executive_snapshots FOR SELECT
    TO anon, authenticated
    USING (organization_id IS NULL);
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;
