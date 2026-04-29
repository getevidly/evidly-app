-- Migration: Add haccp_step enum (8 HACCP Steps)
-- Why: Phase 1 capture flow uses Step as the primary classifier for every
--      temperature reading. Adopted from SmartTemps' proven model and aligned
--      with HACCP standard Steps. Order matches user-facing Step Picker grid.
-- Cross-references:
--   - phase1-capture-flow-mockup.jsx (Step Picker design)
--   - Phase 1 Schema Sprint plan (this is commit 1 of 7)
-- Notable: No table changes here. Commits 2 and 3 add step columns referencing
-- this enum on temperature_logs and receiving_temp_logs respectively.

CREATE TYPE haccp_step AS ENUM (
  'receiving',
  'storage',
  'prep',
  'cooking',
  'hot_holding',
  'cold_holding',
  'serving',
  'cooldown'
);
