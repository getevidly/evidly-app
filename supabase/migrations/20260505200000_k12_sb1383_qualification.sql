-- QUALIFY-BUILD-01: K-12 + SB 1383 qualification columns on organizations
-- K-12 and SB 1383 are SEPARATE flags — both can be true simultaneously
-- A K-12 school auto-qualifies for BOTH
-- Flags are set ONCE at signup — never auto-removed

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS org_type text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS k12_enrolled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS k12_enrolled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sb1383_enrolled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sb1383_enrolled_at timestamp with time zone;
