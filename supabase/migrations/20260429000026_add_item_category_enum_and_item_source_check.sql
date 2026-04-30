-- Migration: Add item_category enum + item-source CHECK constraint on three reading tables
-- Why: Phase 1 Item Picker shows BOTH universal HACCP categories AND the
--      customer's actual menu items (locked decision 1c). Commit 5 added the
--      menu side (menu_items table + menu_item_id FK). This commit adds the
--      categories side AND the CHECK constraint that enforces "exactly one of
--      menu_item_id or item_category populated per row" — never both.
-- Three legitimate states allowed:
--   1. Menu item:        menu_item_id set, item_category null
--   2. Universal cat:    menu_item_id null, item_category set
--   3. Equipment only:   both null (walk-in ambient, no food in scope)
-- Notable choices:
--   - CHECK constraint allows the "both null" case — equipment-only readings
--     are common and shouldn't be forced to claim a food classifier
--   - receiving_temp_logs.item_category previously existed as a free-text
--     column — dropped and replaced with the enum (0 rows, pre-launch safe)
-- Cross-references:
--   - Phase 1 Schema Sprint commit 5 (menu_items table + menu_item_id FK)
--   - Phase 1 Schema Sprint commit 1 (haccp_step enum)

-- ── item_category enum ───────────────────────────────────────────────

CREATE TYPE item_category AS ENUM (
  'poultry',
  'ground_beef',
  'whole_muscle_beef',
  'pork',
  'fish',
  'eggs',
  'vegetables',
  'soup_stew',
  'dairy',
  'grain_pasta'
);

-- ── temperature_logs ─────────────────────────────────────────────────

ALTER TABLE temperature_logs
  ADD COLUMN item_category item_category NULL;

CREATE INDEX idx_temperature_logs_item_category
  ON temperature_logs(item_category)
  WHERE item_category IS NOT NULL;

ALTER TABLE temperature_logs
  ADD CONSTRAINT temperature_logs_item_source_chk
    CHECK (NOT (menu_item_id IS NOT NULL AND item_category IS NOT NULL));

-- ── receiving_temp_logs ──────────────────────────────────────────────

-- Drop the existing text item_category column (0 rows, pre-launch safe)
ALTER TABLE receiving_temp_logs
  DROP COLUMN item_category;

-- Add the new enum-typed column
ALTER TABLE receiving_temp_logs
  ADD COLUMN item_category item_category NULL;

CREATE INDEX idx_receiving_temp_logs_item_category
  ON receiving_temp_logs(item_category)
  WHERE item_category IS NOT NULL;

ALTER TABLE receiving_temp_logs
  ADD CONSTRAINT receiving_temp_logs_item_source_chk
    CHECK (NOT (menu_item_id IS NOT NULL AND item_category IS NOT NULL));

-- ── cooldown_logs ────────────────────────────────────────────────────

ALTER TABLE cooldown_logs
  ADD COLUMN item_category item_category NULL;

CREATE INDEX idx_cooldown_logs_item_category
  ON cooldown_logs(item_category)
  WHERE item_category IS NOT NULL;

ALTER TABLE cooldown_logs
  ADD CONSTRAINT cooldown_logs_item_source_chk
    CHECK (NOT (menu_item_id IS NOT NULL AND item_category IS NOT NULL));
