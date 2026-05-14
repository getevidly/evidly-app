-- ============================================================================
-- Align vendors table columns with codebase expectations.
-- Renames `name` → `company_name` and adds `service_type` column.
-- Context: The initial migration (20260205003451) created `vendors.name` but
-- a later CREATE TABLE IF NOT EXISTS (20260205175243) expected `company_name`.
-- Since IF NOT EXISTS was a no-op, production never got the column rename.
-- ============================================================================

-- Rename name → company_name (idempotent: will error if already renamed)
DO $$ BEGIN
  ALTER TABLE vendors RENAME COLUMN name TO company_name;
EXCEPTION WHEN undefined_column THEN
  NULL; -- already renamed
END $$;

-- Add service_type if missing
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_type VARCHAR(100);
