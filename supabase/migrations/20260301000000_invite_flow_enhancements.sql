-- INVITE-FLOW-1: Enhance team invite and vendor invite flows

-- ── user_invitations enhancements ──────────────────────────────────
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS location_ids uuid[];

-- ── vendors enhancements ───────────────────────────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS invite_status text DEFAULT 'added'
  CHECK (invite_status IN ('added', 'invited', 'connected'));
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS license_cert_number text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS has_insurance_coi boolean DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_ids uuid[];
