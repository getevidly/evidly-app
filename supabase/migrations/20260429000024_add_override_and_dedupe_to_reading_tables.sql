-- Migration: Add override columns + partial unique dedupe indexes on four reading tables
-- Why: Implements two constitutional rules at the schema level —
--   1. No double entry: partial unique index per table prevents a sensor and
--      a kitchen leader from both logging the same identity-key + minute.
--      Index applies only to is_override = false rows.
--   2. Override with audit: when a kitchen leader explicitly overrides a
--      recent reading, the new row is flagged is_override = true and links
--      back via overrides_log_id. Original is marked superseded_by_log_id.
--      Both preserved forever for inspector packets.
-- Tables touched: temperature_logs, receiving_temp_logs, cooldown_logs, cooldown_temp_checks
-- Dedupe keys (locked):
--   temperature_logs:      (equipment_id, step, minute-bucket of reading_time)
--   receiving_temp_logs:   (location_id, vendor_contact_id, step, minute-bucket of delivery_time)
--                          only enforces when vendor_contact_id IS NOT NULL
--   cooldown_logs:         (food_batch_id, minute-bucket of start_time)
--   cooldown_temp_checks:  (cooldown_log_id, stage, minute-bucket of check_time)
-- Cross-references:
--   - Phase 1 Schema Sprint commits 1, 2, 3, 3.5, 3.6 (all dependencies)
-- Pre-launch context: all four tables have 0 rows, unique index creation
-- has no backfill collision risk.

-- ── temperature_logs ─────────────────────────────────────────────────

ALTER TABLE temperature_logs
  ADD COLUMN is_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN overrides_log_id UUID NULL,
  ADD COLUMN superseded_by_log_id UUID NULL,
  ADD COLUMN override_reason TEXT NULL;

ALTER TABLE temperature_logs
  ADD CONSTRAINT temperature_logs_overrides_log_id_fkey
    FOREIGN KEY (overrides_log_id) REFERENCES temperature_logs(id) ON DELETE SET NULL,
  ADD CONSTRAINT temperature_logs_superseded_by_log_id_fkey
    FOREIGN KEY (superseded_by_log_id) REFERENCES temperature_logs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX temperature_logs_dedupe_uq
  ON temperature_logs(
    equipment_id,
    step,
    (date_trunc('minute', reading_time AT TIME ZONE 'UTC')::timestamp)
  )
  WHERE is_override = false;

CREATE INDEX temperature_logs_overrides_log_id_idx
  ON temperature_logs(overrides_log_id)
  WHERE overrides_log_id IS NOT NULL;

-- ── receiving_temp_logs ──────────────────────────────────────────────

ALTER TABLE receiving_temp_logs
  ADD COLUMN is_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN overrides_log_id UUID NULL,
  ADD COLUMN superseded_by_log_id UUID NULL,
  ADD COLUMN override_reason TEXT NULL;

ALTER TABLE receiving_temp_logs
  ADD CONSTRAINT receiving_temp_logs_overrides_log_id_fkey
    FOREIGN KEY (overrides_log_id) REFERENCES receiving_temp_logs(id) ON DELETE SET NULL,
  ADD CONSTRAINT receiving_temp_logs_superseded_by_log_id_fkey
    FOREIGN KEY (superseded_by_log_id) REFERENCES receiving_temp_logs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX receiving_temp_logs_dedupe_uq
  ON receiving_temp_logs(
    location_id,
    vendor_contact_id,
    step,
    (date_trunc('minute', delivery_time AT TIME ZONE 'UTC')::timestamp)
  )
  WHERE is_override = false AND vendor_contact_id IS NOT NULL;

CREATE INDEX receiving_temp_logs_overrides_log_id_idx
  ON receiving_temp_logs(overrides_log_id)
  WHERE overrides_log_id IS NOT NULL;

-- ── cooldown_logs ────────────────────────────────────────────────────

ALTER TABLE cooldown_logs
  ADD COLUMN is_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN overrides_log_id UUID NULL,
  ADD COLUMN superseded_by_log_id UUID NULL,
  ADD COLUMN override_reason TEXT NULL;

ALTER TABLE cooldown_logs
  ADD CONSTRAINT cooldown_logs_overrides_log_id_fkey
    FOREIGN KEY (overrides_log_id) REFERENCES cooldown_logs(id) ON DELETE SET NULL,
  ADD CONSTRAINT cooldown_logs_superseded_by_log_id_fkey
    FOREIGN KEY (superseded_by_log_id) REFERENCES cooldown_logs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX cooldown_logs_dedupe_uq
  ON cooldown_logs(
    food_batch_id,
    (date_trunc('minute', start_time AT TIME ZONE 'UTC')::timestamp)
  )
  WHERE is_override = false;

CREATE INDEX cooldown_logs_overrides_log_id_idx
  ON cooldown_logs(overrides_log_id)
  WHERE overrides_log_id IS NOT NULL;

-- ── cooldown_temp_checks ─────────────────────────────────────────────

ALTER TABLE cooldown_temp_checks
  ADD COLUMN is_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN overrides_log_id UUID NULL,
  ADD COLUMN superseded_by_log_id UUID NULL,
  ADD COLUMN override_reason TEXT NULL;

ALTER TABLE cooldown_temp_checks
  ADD CONSTRAINT cooldown_temp_checks_overrides_log_id_fkey
    FOREIGN KEY (overrides_log_id) REFERENCES cooldown_temp_checks(id) ON DELETE SET NULL,
  ADD CONSTRAINT cooldown_temp_checks_superseded_by_log_id_fkey
    FOREIGN KEY (superseded_by_log_id) REFERENCES cooldown_temp_checks(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX cooldown_temp_checks_dedupe_uq
  ON cooldown_temp_checks(
    cooldown_log_id,
    stage,
    (date_trunc('minute', check_time AT TIME ZONE 'UTC')::timestamp)
  )
  WHERE is_override = false;

CREATE INDEX cooldown_temp_checks_overrides_log_id_idx
  ON cooldown_temp_checks(overrides_log_id)
  WHERE overrides_log_id IS NOT NULL;
