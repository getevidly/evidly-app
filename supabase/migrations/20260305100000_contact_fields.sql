-- ══════════════════════════════════════════════════════
-- Add contact fields to organizations, locations, vendors, user_profiles, support_tickets, remote_connect_sessions
-- ══════════════════════════════════════════════════════

-- Organizations: primary POC + alternate contact + phones
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS primary_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS alternate_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS alternate_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS alternate_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS main_phone             TEXT,
  ADD COLUMN IF NOT EXISTS billing_email          TEXT;

-- Locations: site-level contact
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS site_contact_name   TEXT,
  ADD COLUMN IF NOT EXISTS site_contact_email  TEXT,
  ADD COLUMN IF NOT EXISTS site_contact_phone  TEXT,
  ADD COLUMN IF NOT EXISTS site_phone          TEXT,
  ADD COLUMN IF NOT EXISTS manager_name        TEXT,
  ADD COLUMN IF NOT EXISTS manager_phone       TEXT;

-- Vendors: primary + alternate contact + phones
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS primary_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS alternate_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS alternate_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS alternate_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS main_phone             TEXT,
  ADD COLUMN IF NOT EXISTS website                TEXT;

-- User profiles: phone
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Support tickets: submitter phone
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS submitted_by_phone TEXT;

-- Remote connect sessions: customer phone
ALTER TABLE remote_connect_sessions
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;
