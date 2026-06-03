-- ============================================================
-- Sprint 2.1 — regulatory_standards text[] on service_type_definitions
-- Stores verified regulatory standard names for floor breach copy.
-- Only KEC and PC seeded now (verified primary sources).
-- Remaining services seeded in Phase 7 regulatory_citations sprint.
-- ============================================================

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS regulatory_standards text[] DEFAULT NULL;

UPDATE service_type_definitions
  SET regulatory_standards = ARRAY['NFPA 96']
  WHERE code = 'KEC';

UPDATE service_type_definitions
  SET regulatory_standards = ARRAY['CalCode']
  WHERE code = 'PC';
