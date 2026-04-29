-- Extend temperature_equipment with zone assignment, CCP classification,
-- repair vendor links, and sensor device reference.
--
-- New columns:
--   zone_id                    — FK to zones; assigns equipment to a kitchen zone.
--   ccp_number                 — HACCP Critical Control Point (1–5, smallint).
--   primary_repair_vendor_id   — FK to vendor_contacts (equipment_repair type).
--   backup_repair_vendor_id    — FK to vendor_contacts (backup repair vendor).
--   sensor_device_id           — Sensor hardware ID (no FK; wired in a later commit).
--
-- ccp_number is the bare integer. Display layer renders "CCP 4" or
-- "Critical Control Point 4 — Cooling" depending on context.
-- NULL = not a designated CCP.
--
-- HACCP CCP mapping:
--   1 = Receiving
--   2 = Cold Storage / Cold Holding
--   3 = Hot Holding
--   4 = Cooldown
--   5 = Reheating / Cooking
--
-- Auto-backfill CASE statement maps equipment_type → ccp_number.
-- No-op as of 2026-04-29 (table is empty), but documents the canonical
-- mapping for future inserts.
--
-- Canonical equipment_type values (from TempLogs.tsx):
--   Storage:  storage_cold, storage_frozen, cooler, freezer
--   Holding:  holding_cold, cold_holding, holding_hot, hot_hold, hot_holding

ALTER TABLE temperature_equipment
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ccp_number smallint CHECK (ccp_number BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS primary_repair_vendor_id uuid REFERENCES vendor_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS backup_repair_vendor_id uuid REFERENCES vendor_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sensor_device_id uuid;

-- Backfill ccp_number from equipment_type (no-op while table is empty).
UPDATE temperature_equipment
SET ccp_number = CASE
  WHEN equipment_type IN ('receiving_station', 'receiving_thermometer')
    THEN 1
  WHEN equipment_type IN ('storage_cold', 'cooler', 'walk_in_cooler', 'reach_in_cooler',
                          'refrigerator', 'freezer', 'walk_in_freezer', 'storage_frozen',
                          'holding_cold', 'cold_holding', 'salad_bar', 'sandwich_station')
    THEN 2
  WHEN equipment_type IN ('holding_hot', 'hot_hold', 'hot_holding',
                          'steam_table', 'soup_well', 'salamander')
    THEN 3
  WHEN equipment_type IN ('blast_chiller', 'cooldown_station')
    THEN 4
  WHEN equipment_type IN ('reheating_oven', 'oven', 'cooking')
    THEN 5
  ELSE NULL
END
WHERE ccp_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_temperature_equipment_zone_id ON temperature_equipment(zone_id);
CREATE INDEX IF NOT EXISTS idx_temperature_equipment_ccp_number ON temperature_equipment(ccp_number);
CREATE INDEX IF NOT EXISTS idx_temperature_equipment_primary_repair_vendor_id ON temperature_equipment(primary_repair_vendor_id);
