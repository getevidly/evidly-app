-- Add branding jsonb column to organizations table.
-- Stores the full BrandingConfig (colors, tagline, features, etc.) per org.
-- Existing rows get empty object default; context reads this on auth.
-- Verified against LIVE PROD: no branding column exists on organizations.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organizations.branding IS
  'Full BrandingConfig JSON: colors, tagline, features, poweredByVisible, etc.';
