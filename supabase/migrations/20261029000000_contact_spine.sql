-- contact_spine — link outreach recipients → organisations → users.
-- One record carried forward through three states:
--   Contact only            (organization_id IS NULL)
--   Contact + organisation  (organization_id set, user_id NULL)
--   Contact + org + user    (both set)

-- ══════════════════════════════════════════════════════════════
-- 1a. Contact spine FKs on county_briefing_recipients
-- ══════════════════════════════════════════════════════════════

ALTER TABLE county_briefing_recipients
  ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_cbr_org  ON county_briefing_recipients(organization_id);
CREATE INDEX IF NOT EXISTS idx_cbr_user ON county_briefing_recipients(user_id);

-- ══════════════════════════════════════════════════════════════
-- 1b. access_via + billing on organizations
-- ══════════════════════════════════════════════════════════════

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS access_via TEXT
    CHECK (access_via IN ('cpp_client', 'signed_on_directly')),
  ADD COLUMN IF NOT EXISTS billing TEXT NOT NULL DEFAULT 'not_paying'
    CHECK (billing IN ('not_paying', 'in_trial', 'paying'));

-- Backfill: existing CPP clients get access_via = 'cpp_client'
UPDATE organizations SET access_via = 'cpp_client'
  WHERE is_cpp_client = true AND access_via IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 1c. Insurance fields on organizations (org level)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS insurance_broker_agency  TEXT,
  ADD COLUMN IF NOT EXISTS insurance_broker_contact TEXT,
  ADD COLUMN IF NOT EXISTS insurance_carrier        TEXT,
  ADD COLUMN IF NOT EXISTS insurance_email          TEXT,
  ADD COLUMN IF NOT EXISTS insurance_phone          TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_renewal DATE;

-- ══════════════════════════════════════════════════════════════
-- 1d. Property manager fields on locations (per-location)
-- Three kitchens can have three landlords and three leases.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS pm_company      TEXT,
  ADD COLUMN IF NOT EXISTS pm_contact      TEXT,
  ADD COLUMN IF NOT EXISTS pm_email        TEXT,
  ADD COLUMN IF NOT EXISTS pm_phone        TEXT,
  ADD COLUMN IF NOT EXISTS pm_lease_renewal DATE;

-- ══════════════════════════════════════════════════════════════
-- 1e. Vendor outreach log — every reach-out, dated, per org
-- After 3 attempts over 14+ days the team can mark not-responding.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_outreach_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_name      TEXT NOT NULL,
  contact_method   TEXT NOT NULL CHECK (contact_method IN ('email', 'phone', 'in_person')),
  contacted_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  contacted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vendor_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON vendor_outreach_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY staff_read ON vendor_outreach_log
  FOR SELECT TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'platform_admin'
  );

CREATE INDEX idx_vol_org        ON vendor_outreach_log(organization_id);
CREATE INDEX idx_vol_org_vendor  ON vendor_outreach_log(organization_id, vendor_name);

-- ══════════════════════════════════════════════════════════════
-- 1f. Vendor not-responding flag (per-org vendors table)
-- A marked vendor's records come OUT of the required denominator.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS outreach_not_responding    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outreach_not_responding_at TIMESTAMPTZ;
