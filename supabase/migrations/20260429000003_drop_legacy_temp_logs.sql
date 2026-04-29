-- Drop legacy temp_logs table.
-- Superseded by temperature_logs (migration 20260307000000).
-- Phase 0 inventory (2026-04-28) confirmed zero rows and no code references.
-- Verified empty 2026-04-29 before drop.

DROP TABLE IF EXISTS temp_logs CASCADE;
