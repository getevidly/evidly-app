-- Backfill location_jurisdictions for the 5 active locations with known addresses.
-- Skips "Acme Restaurant — Main" (no address data).
-- Each location gets two rows: food_safety + fire_safety (same jurisdiction row
-- carries both agency_name and fire_ahj_name for CA counties).

-- ── 1. FIX WRONG ROW ──────────────────────────────────────────────────
-- "Test Food — Main Kitchen" (Fresno 93710) was incorrectly linked to Merced County.
-- Correct it to Fresno County.

UPDATE location_jurisdictions
SET jurisdiction_id = '29094922-8400-4c4d-b33a-3a170c5efd1c',
    updated_at      = now()
WHERE location_id     = '5b9a9960-462c-4d29-a9cd-38bbca3d157e'
  AND jurisdiction_id = '81e6c154-dd33-4499-8344-1dcf2f7fe5fa'
  AND jurisdiction_layer = 'food_safety';

-- ── 2. INSERT food_safety + fire_safety ROWS ──────────────────────────
-- Upsert to avoid conflicts with the row we just fixed above.

INSERT INTO location_jurisdictions
  (location_id, jurisdiction_id, jurisdiction_layer, auto_detected)
VALUES
  -- Test Food — Main Kitchen (Fresno) — fire_safety layer (food_safety fixed above)
  ('5b9a9960-462c-4d29-a9cd-38bbca3d157e', '29094922-8400-4c4d-b33a-3a170c5efd1c', 'fire_safety', true),

  -- Fresno Test Kitchen
  ('aaaaaaaa-bbbb-cccc-dddd-ffffffffffff', '29094922-8400-4c4d-b33a-3a170c5efd1c', 'food_safety', true),
  ('aaaaaaaa-bbbb-cccc-dddd-ffffffffffff', '29094922-8400-4c4d-b33a-3a170c5efd1c', 'fire_safety', true),

  -- Merced Location
  ('b80d84e8-2499-4e8c-ac30-03f5590b7b53', '81e6c154-dd33-4499-8344-1dcf2f7fe5fa', 'food_safety', true),
  ('b80d84e8-2499-4e8c-ac30-03f5590b7b53', '81e6c154-dd33-4499-8344-1dcf2f7fe5fa', 'fire_safety', true),

  -- Test Kitchen — Fresno
  ('e3a21d94-b1a8-4f0d-8175-20b5ededbe20', '29094922-8400-4c4d-b33a-3a170c5efd1c', 'food_safety', true),
  ('e3a21d94-b1a8-4f0d-8175-20b5ededbe20', '29094922-8400-4c4d-b33a-3a170c5efd1c', 'fire_safety', true),

  -- Test Kitchen (smoke) — Merced
  ('fd1e4dc1-afce-4df5-89eb-10d62cf8a99d', '81e6c154-dd33-4499-8344-1dcf2f7fe5fa', 'food_safety', true),
  ('fd1e4dc1-afce-4df5-89eb-10d62cf8a99d', '81e6c154-dd33-4499-8344-1dcf2f7fe5fa', 'fire_safety', true)

ON CONFLICT (location_id, jurisdiction_id, jurisdiction_layer) DO NOTHING;

-- ── 3. UPDATE locations.jurisdiction_id for the 3 nulls ───────────────

UPDATE locations
SET jurisdiction_id = '29094922-8400-4c4d-b33a-3a170c5efd1c',
    updated_at      = now()
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff'
  AND jurisdiction_id IS NULL;

UPDATE locations
SET jurisdiction_id = '29094922-8400-4c4d-b33a-3a170c5efd1c',
    updated_at      = now()
WHERE id = '5b9a9960-462c-4d29-a9cd-38bbca3d157e'
  AND jurisdiction_id IS NULL;

UPDATE locations
SET jurisdiction_id = '81e6c154-dd33-4499-8344-1dcf2f7fe5fa',
    updated_at      = now()
WHERE id = 'fd1e4dc1-afce-4df5-89eb-10d62cf8a99d'
  AND jurisdiction_id IS NULL;

-- NOTE: "Acme Restaurant — Main" (a9ff8ef1-8fa3-46fd-9f86-8aed09f74f2f)
-- is SKIPPED — no address, city, state, or zip. Cannot match to jurisdiction.
