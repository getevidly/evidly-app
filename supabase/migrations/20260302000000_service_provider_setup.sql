-- SERVICE-PROVIDER-1: Service Provider Account Setup + Client Invitation Flow
--
-- Extends the vendor ecosystem with service provider profiles, document tracking,
-- client invitations, and auto-linking on client signup.

-- ── 1. Service Provider Profiles ──────────────────────────────
-- Extends the vendors table with setup/onboarding data for service providers.
CREATE TABLE IF NOT EXISTS service_provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE UNIQUE,
  dba TEXT,
  services TEXT[] DEFAULT '{}',
  sub_services TEXT[] DEFAULT '{}',
  website TEXT,
  service_area TEXT,
  preferred_window TEXT DEFAULT 'after_close',
  service_report_requirements TEXT[] DEFAULT '{}',
  setup_completed BOOLEAN DEFAULT FALSE,
  setup_completed_at TIMESTAMPTZ,
  service_defaults JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_profiles_vendor ON service_provider_profiles(vendor_id);

ALTER TABLE service_provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_profiles_select" ON service_provider_profiles
  FOR SELECT USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sp_profiles_insert" ON service_provider_profiles
  FOR INSERT WITH CHECK (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "sp_profiles_update" ON service_provider_profiles
  FOR UPDATE USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ── 2. Service Provider Documents ─────────────────────────────
-- COI, certifications, licenses with expiration tracking and auto-sharing.
CREATE TABLE IF NOT EXISTS service_provider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'certification', 'insurance_coi', 'insurance_workers_comp',
    'insurance_auto', 'license', 'other'
  )),
  name TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  provider_name TEXT,
  policy_number TEXT,
  coverage_amount DECIMAL,
  cert_number TEXT,
  cert_state TEXT,
  expiration_date DATE,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'expiring', 'expired')),
  auto_share_with_clients BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_docs_vendor ON service_provider_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sp_docs_expiry ON service_provider_documents(expiration_date);

ALTER TABLE service_provider_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_docs_select" ON service_provider_documents
  FOR SELECT USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
    OR vendor_id IN (
      SELECT vendor_id FROM service_provider_client_links
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "sp_docs_insert" ON service_provider_documents
  FOR INSERT WITH CHECK (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sp_docs_update" ON service_provider_documents
  FOR UPDATE USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- ── 3. Client Invitations ─────────────────────────────────────
-- Tracks invitations sent by service providers to prospective clients.
CREATE TABLE IF NOT EXISTS client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  invited_by UUID,
  invite_code TEXT UNIQUE NOT NULL,
  contact_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  services_provided TEXT[] DEFAULT '{}',
  frequency TEXT,
  num_locations INTEGER DEFAULT 1,
  personal_message TEXT,
  k2c_referral BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'signed_up', 'bounced')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  client_org_id UUID REFERENCES organizations(id),
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_inv_vendor ON client_invitations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_client_inv_code ON client_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_client_inv_email ON client_invitations(email);
CREATE INDEX IF NOT EXISTS idx_client_inv_status ON client_invitations(status);

ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_inv_select" ON client_invitations
  FOR SELECT USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "client_inv_insert" ON client_invitations
  FOR INSERT WITH CHECK (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "client_inv_update" ON client_invitations
  FOR UPDATE USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- ── 4. Service Provider ↔ Client Links ────────────────────────
-- Active vendor-client relationships created when invited clients sign up.
CREATE TABLE IF NOT EXISTS service_provider_client_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES client_invitations(id),
  services_provided TEXT[] DEFAULT '{}',
  coi_shared BOOLEAN DEFAULT FALSE,
  certs_shared BOOLEAN DEFAULT FALSE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_links_vendor ON service_provider_client_links(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sp_links_org ON service_provider_client_links(org_id);

ALTER TABLE service_provider_client_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_links_select" ON service_provider_client_links
  FOR SELECT USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
    OR org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "sp_links_insert" ON service_provider_client_links
  FOR INSERT WITH CHECK (
    vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );
