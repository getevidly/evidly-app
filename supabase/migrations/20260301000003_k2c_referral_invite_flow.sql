-- ================================================================
-- K2C Referral Invite Flow
-- Supports referral code generation per org, invite tracking,
-- and viral chain referrals for the Kitchen to Community program.
-- ================================================================

-- ── k2c_referral_codes: one code per organization ──────────────
CREATE TABLE IF NOT EXISTS k2c_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referred_by_code TEXT  -- chain tracking: which code brought this org in
);

CREATE INDEX idx_k2c_codes_org ON k2c_referral_codes(organization_id);
CREATE INDEX idx_k2c_codes_code ON k2c_referral_codes(code);

ALTER TABLE k2c_referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org referral codes"
  ON k2c_referral_codes FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org referral codes"
  ON k2c_referral_codes FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access k2c_referral_codes"
  ON k2c_referral_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── k2c_referrals: each invite sent ───────────────────────────
CREATE TABLE IF NOT EXISTS k2c_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_code TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'invited',  -- invited | signed_up | active | expired
  meals_generated INTEGER NOT NULL DEFAULT 0,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_up_at TIMESTAMPTZ,
  chain_depth INTEGER NOT NULL DEFAULT 1,
  referred_org_id UUID REFERENCES organizations(id),
  referred_org_code TEXT  -- the new code generated for the referred org
);

CREATE INDEX idx_k2c_referrals_org ON k2c_referrals(referrer_org_id, invited_at DESC);
CREATE INDEX idx_k2c_referrals_code ON k2c_referrals(referrer_code);
CREATE INDEX idx_k2c_referrals_email ON k2c_referrals(email);
CREATE INDEX idx_k2c_referrals_status ON k2c_referrals(status);

ALTER TABLE k2c_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org referrals"
  ON k2c_referrals FOR SELECT TO authenticated
  USING (referrer_org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org referrals"
  ON k2c_referrals FOR INSERT TO authenticated
  WITH CHECK (referrer_org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org referrals"
  ON k2c_referrals FOR UPDATE TO authenticated
  USING (referrer_org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access k2c_referrals"
  ON k2c_referrals FOR ALL TO service_role
  USING (true) WITH CHECK (true);
