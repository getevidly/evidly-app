-- ============================================================================
-- GAP-06: Employee Training & Certification Tracker — Schema Enhancements
-- ============================================================================
-- The employee_certifications table already exists (migration 20260205215132).
-- This migration adds the GAP-06 required fields that are missing:
--   - certification_type (enum: food_handler, cfpm, haccp, fire_safety, etc.)
--   - issuing_body (text: ServSafe, ANSI, State of CA, etc.)
--   - certificate_number (text: optional cert ID)
--
-- These fields enable filtering by cert type and compliance risk flagging.
-- ============================================================================

-- Add new columns to employee_certifications (idempotent with IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_certifications' AND column_name = 'certification_type'
  ) THEN
    ALTER TABLE employee_certifications ADD COLUMN certification_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_certifications' AND column_name = 'issuing_body'
  ) THEN
    ALTER TABLE employee_certifications ADD COLUMN issuing_body text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_certifications' AND column_name = 'certificate_number'
  ) THEN
    ALTER TABLE employee_certifications ADD COLUMN certificate_number text;
  END IF;
END $$;

-- Add comment for compliance risk querying (GAP-11 forward-looking)
COMMENT ON TABLE employee_certifications IS
  'GAP-06: Employee certifications with expiration tracking. '
  'Expired certs (expiration_date < now()) = compliance risk flag for GAP-11 scoring. '
  'Status: active | expiring_soon (<=30d) | expired. Calculate on read, not stored.';

-- Index for cert type filtering
CREATE INDEX IF NOT EXISTS idx_employee_certifications_type
  ON employee_certifications(certification_type);
