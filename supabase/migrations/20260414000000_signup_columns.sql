-- SIGNUP-FIX-01: Ensure all columns that signup writes to organizations exist
-- Columns from prior migration 20260505200000: org_type, k12_enrolled, k12_enrolled_at, sb1383_enrolled, sb1383_enrolled_at
-- This migration adds any remaining columns and forces PostgREST schema-cache reload

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS org_type text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS k12_enrolled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS k12_enrolled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sb1383_enrolled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sb1383_enrolled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS jurisdiction_selection text;

-- Force PostgREST to pick up new columns immediately
NOTIFY pgrst, 'reload schema';
