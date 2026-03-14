-- AUDIT-FIX-07 / A-5: Additional org settings columns for admin management

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS notes text;
