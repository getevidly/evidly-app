-- Migration: add_regions_hierarchy
-- Context: Adds the regions table as a grouping layer between organizations and locations.
-- Creates regions table scoped per organization, adds nullable region_id FK to locations
-- (ON DELETE SET NULL) and to user_location_access (ON DELETE CASCADE).
-- No RLS policy changes in this migration — those follow in commit 14b.
--
-- ULA access semantics (documented, not enforced by constraints):
--   location_id set + region_id null  → location-scoped access
--   region_id set + location_id null  → region-scoped access (all locations in that region)
--   both null + organization_id set   → org-scoped access (all locations in the org)
--   both set                          → location-scoped wins (more specific scope)

BEGIN;

-- ── 1. Create regions table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  code            text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Index for "list regions in this org" queries
CREATE INDEX IF NOT EXISTS idx_regions_org ON regions USING btree (organization_id);

-- No duplicate region names within an org
ALTER TABLE regions DROP CONSTRAINT IF EXISTS regions_org_name_unique;
ALTER TABLE regions ADD CONSTRAINT regions_org_name_unique UNIQUE (organization_id, name);

-- ── 2. Add region_id to locations ───────────────────────────────────────────
-- Nullable FK — deleting a region unassigns its locations rather than deleting them
ALTER TABLE locations ADD COLUMN IF NOT EXISTS region_id uuid;

ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_region_id_fkey;
ALTER TABLE locations ADD CONSTRAINT locations_region_id_fkey
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL;

-- Partial index for region-scoped joins (most rows will be NULL during transition)
CREATE INDEX IF NOT EXISTS idx_locations_region
  ON locations USING btree (region_id) WHERE region_id IS NOT NULL;

-- ── 3. Add region_id to user_location_access ────────────────────────────────
-- Nullable FK — deleting a region cascades to remove the regional manager's scoped access
ALTER TABLE user_location_access ADD COLUMN IF NOT EXISTS region_id uuid;

ALTER TABLE user_location_access DROP CONSTRAINT IF EXISTS ula_region_id_fkey;
ALTER TABLE user_location_access ADD CONSTRAINT ula_region_id_fkey
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE;

-- Partial index for ULA region lookups
CREATE INDEX IF NOT EXISTS idx_ula_region
  ON user_location_access USING btree (region_id) WHERE region_id IS NOT NULL;

-- ── 4. Verification ─────────────────────────────────────────────────────────
DO $verify$
DECLARE
  v_regions_exists boolean;
  v_loc_region_id boolean;
  v_ula_region_id boolean;
  v_fk_loc boolean;
  v_fk_ula boolean;
  v_idx_loc boolean;
  v_idx_ula boolean;
  v_uq boolean;
BEGIN
  -- regions table exists with expected columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'regions'
  ) INTO v_regions_exists;
  IF NOT v_regions_exists THEN
    RAISE EXCEPTION 'regions table does not exist';
  END IF;

  -- locations.region_id exists and is uuid + nullable
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations'
      AND column_name = 'region_id' AND data_type = 'uuid' AND is_nullable = 'YES'
  ) INTO v_loc_region_id;
  IF NOT v_loc_region_id THEN
    RAISE EXCEPTION 'locations.region_id missing or wrong type/nullable';
  END IF;

  -- user_location_access.region_id exists and is uuid + nullable
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_location_access'
      AND column_name = 'region_id' AND data_type = 'uuid' AND is_nullable = 'YES'
  ) INTO v_ula_region_id;
  IF NOT v_ula_region_id THEN
    RAISE EXCEPTION 'user_location_access.region_id missing or wrong type/nullable';
  END IF;

  -- FK: locations_region_id_fkey
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'locations_region_id_fkey'
      AND conrelid = 'public.locations'::regclass
  ) INTO v_fk_loc;
  IF NOT v_fk_loc THEN
    RAISE EXCEPTION 'FK locations_region_id_fkey missing';
  END IF;

  -- FK: ula_region_id_fkey
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ula_region_id_fkey'
      AND conrelid = 'public.user_location_access'::regclass
  ) INTO v_fk_ula;
  IF NOT v_fk_ula THEN
    RAISE EXCEPTION 'FK ula_region_id_fkey missing';
  END IF;

  -- Partial index: idx_locations_region
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'locations' AND indexname = 'idx_locations_region'
  ) INTO v_idx_loc;
  IF NOT v_idx_loc THEN
    RAISE EXCEPTION 'Index idx_locations_region missing';
  END IF;

  -- Partial index: idx_ula_region
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'user_location_access' AND indexname = 'idx_ula_region'
  ) INTO v_idx_ula;
  IF NOT v_idx_ula THEN
    RAISE EXCEPTION 'Index idx_ula_region missing';
  END IF;

  -- Unique constraint: regions_org_name_unique
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'regions_org_name_unique'
      AND conrelid = 'public.regions'::regclass
  ) INTO v_uq;
  IF NOT v_uq THEN
    RAISE EXCEPTION 'Unique constraint regions_org_name_unique missing';
  END IF;
END $verify$;

COMMIT;
