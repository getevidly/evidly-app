-- ══════════════════════════════════════════════════════════════
-- Add missing columns to jurisdictions for county config migrations
-- These columns are referenced by county configs (20260304+)
-- but were not in the original CREATE TABLE.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE jurisdictions
  ADD COLUMN IF NOT EXISTS agency_phone TEXT,
  ADD COLUMN IF NOT EXISTS agency_address TEXT,
  ADD COLUMN IF NOT EXISTS public_portal TEXT,
  ADD COLUMN IF NOT EXISTS regulatory_code TEXT,
  ADD COLUMN IF NOT EXISTS transparency_level TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS inspection_frequency TEXT,
  ADD COLUMN IF NOT EXISTS last_verified TIMESTAMPTZ;
