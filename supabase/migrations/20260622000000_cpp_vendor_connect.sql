-- CPP-VENDOR-CONNECT-01: CPP Free Tier + Vendor Connect Partner Program
-- Part 1: CPP client columns + plan_tier constraint update
-- Part 2: Vendor Connect tables (profiles, spots, applications, leads)

-- ══════════════════════════════════════════════════════════════
-- 1a. ALTER organizations — CPP client fields + plan_tier
-- ══════════════════════════════════════════════════════════════

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_cpp_client BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cpp_client_since DATE,
  ADD COLUMN IF NOT EXISTS cpp_account_number TEXT;

-- Update plan_tier CHECK to include cpp_free
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_tier_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_tier_check
  CHECK (plan_tier IN ('trial','founder','standard','enterprise','cpp_free'));

-- ══════════════════════════════════════════════════════════════
-- 1b. ALTER vendors — two-tier vendor flag
-- ══════════════════════════════════════════════════════════════

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS vendor_tier TEXT DEFAULT 'my_vendors'
    CHECK (vendor_tier IN ('my_vendors','vendor_connect')),
  ADD COLUMN IF NOT EXISTS is_cpp_vetted BOOLEAN DEFAULT false;

-- ══════════════════════════════════════════════════════════════
-- 2. Vendor Connect Profiles
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_connect_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Partner tier
  partner_tier TEXT NOT NULL DEFAULT 'preferred'
    CHECK (partner_tier IN ('preferred','elite','founding')),
  is_founding_partner BOOLEAN DEFAULT false,

  -- Verification
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  application_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (application_status IN ('pending','approved','rejected','suspended')),
  rejection_reason TEXT,

  -- Profile
  company_name TEXT NOT NULL,
  logo_url TEXT,
  tagline TEXT,
  description TEXT,
  service_types TEXT[] NOT NULL DEFAULT '{}',
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  website TEXT,
  phone TEXT,
  email TEXT NOT NULL,

  -- Credentials
  ikeca_certified BOOLEAN DEFAULT false,
  ikeca_member_id TEXT,
  license_number TEXT,

  -- Scarcity
  primary_county TEXT,

  -- Performance
  performance_score NUMERIC(4,1) DEFAULT 0,
  total_jobs_completed INTEGER DEFAULT 0,
  avg_response_hours NUMERIC(4,1),
  cert_quality_score NUMERIC(4,1),
  on_time_rate NUMERIC(4,1),

  -- Marketplace
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vcp_active ON vendor_connect_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vcp_county ON vendor_connect_profiles(primary_county);
CREATE INDEX IF NOT EXISTS idx_vcp_tier ON vendor_connect_profiles(partner_tier);

-- ══════════════════════════════════════════════════════════════
-- 3. Vendor Connect Spots — county capacity tracking
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_connect_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county TEXT NOT NULL,
  service_type TEXT NOT NULL,
  max_spots INTEGER NOT NULL DEFAULT 3,
  filled_spots INTEGER NOT NULL DEFAULT 0,
  waitlist_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(county, service_type)
);

-- Seed spot capacity for key CA counties
INSERT INTO vendor_connect_spots (county, service_type, max_spots)
SELECT county, service_type, 3
FROM (
  VALUES
    ('Los Angeles','hood_cleaning'),('Los Angeles','fire_suppression'),
    ('Orange','hood_cleaning'),('Orange','fire_suppression'),
    ('San Diego','hood_cleaning'),('San Diego','fire_suppression'),
    ('San Bernardino','hood_cleaning'),('San Bernardino','fire_suppression'),
    ('Riverside','hood_cleaning'),('Riverside','fire_suppression'),
    ('Fresno','hood_cleaning'),('Fresno','fire_suppression'),
    ('Merced','hood_cleaning'),('Merced','fire_suppression'),
    ('Sacramento','hood_cleaning'),('Sacramento','fire_suppression'),
    ('Santa Clara','hood_cleaning'),('Santa Clara','fire_suppression'),
    ('Alameda','hood_cleaning'),('Alameda','fire_suppression')
) AS t(county, service_type)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. Vendor Connect Applications
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_connect_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_types TEXT[] NOT NULL DEFAULT '{}',
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  ikeca_certified BOOLEAN DEFAULT false,
  years_in_business INTEGER,
  why_apply TEXT,
  referred_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','waitlisted')),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vca_status ON vendor_connect_applications(status);
CREATE INDEX IF NOT EXISTS idx_vca_email ON vendor_connect_applications(email);

-- ══════════════════════════════════════════════════════════════
-- 5. Vendor Connect Leads
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_connect_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  operator_name TEXT,
  operator_phone TEXT,
  location_address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','quoted','won','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vcl_vendor ON vendor_connect_leads(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vcl_org ON vendor_connect_leads(org_id);

-- ══════════════════════════════════════════════════════════════
-- 6. RLS Policies
-- ══════════════════════════════════════════════════════════════

ALTER TABLE vendor_connect_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_connect_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_connect_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_connect_leads ENABLE ROW LEVEL SECURITY;

-- vendor_connect_profiles: public read (active only), service_role full access
DROP POLICY IF EXISTS "Anyone can view active vendor connect profiles" ON vendor_connect_profiles;
CREATE POLICY "Anyone can view active vendor connect profiles"
  ON vendor_connect_profiles FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Service role full access vendor connect profiles" ON vendor_connect_profiles;
CREATE POLICY "Service role full access vendor connect profiles"
  ON vendor_connect_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- vendor_connect_spots: public read, service_role write
DROP POLICY IF EXISTS "Anyone can view vendor connect spots" ON vendor_connect_spots;
CREATE POLICY "Anyone can view vendor connect spots"
  ON vendor_connect_spots FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access vendor connect spots" ON vendor_connect_spots;
CREATE POLICY "Service role full access vendor connect spots"
  ON vendor_connect_spots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- vendor_connect_applications: anon can insert (public form), service_role manages
DROP POLICY IF EXISTS "Anyone can submit vendor connect applications" ON vendor_connect_applications;
CREATE POLICY "Anyone can submit vendor connect applications"
  ON vendor_connect_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access vendor connect applications" ON vendor_connect_applications;
CREATE POLICY "Service role full access vendor connect applications"
  ON vendor_connect_applications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- vendor_connect_leads: org-scoped read, service_role full access
DROP POLICY IF EXISTS "Users can view own org vendor connect leads" ON vendor_connect_leads;
CREATE POLICY "Users can view own org vendor connect leads"
  ON vendor_connect_leads FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role full access vendor connect leads" ON vendor_connect_leads;
CREATE POLICY "Service role full access vendor connect leads"
  ON vendor_connect_leads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════
-- 7. Realtime
-- ══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE vendor_connect_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE vendor_connect_leads;
