-- Referral Program, Customer Credits & Service Requests
-- Migration: 20260526000000_referrals_service_requests.sql

-- ── Referral codes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  location_id UUID,

  code TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'vip', 'campaign')),

  referrer_reward_amount DECIMAL(10,2) DEFAULT 50.00,
  referrer_reward_type TEXT DEFAULT 'credit' CHECK (referrer_reward_type IN ('credit', 'discount_percent', 'free_service')),
  referee_reward_amount DECIMAL(10,2) DEFAULT 25.00,
  referee_reward_type TEXT DEFAULT 'discount',

  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  total_rewards_earned DECIMAL(10,2) DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_org ON referral_codes(organization_id);

-- ── Referrals ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  referrer_org_id UUID NOT NULL,

  referee_name TEXT NOT NULL,
  referee_business_name TEXT,
  referee_email TEXT,
  referee_phone TEXT,
  referee_address TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'quoted', 'converted', 'lost', 'expired')),

  referee_org_id UUID,
  first_job_id UUID,
  first_job_completed_at TIMESTAMPTZ,

  referrer_reward_status TEXT DEFAULT 'pending' CHECK (referrer_reward_status IN ('pending', 'earned', 'paid', 'expired')),
  referrer_reward_amount DECIMAL(10,2),
  referrer_reward_paid_at TIMESTAMPTZ,

  referee_reward_status TEXT DEFAULT 'pending' CHECK (referee_reward_status IN ('pending', 'earned', 'paid', 'expired')),
  referee_reward_amount DECIMAL(10,2),
  referee_reward_applied_at TIMESTAMPTZ,

  notes TEXT,
  source TEXT CHECK (source IN ('sms', 'email', 'qr_code', 'link', 'manual')),
  utm_source TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_org_id);

-- ── Customer credits ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  amount DECIMAL(10,2) NOT NULL,
  remaining_amount DECIMAL(10,2) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('referral', 'promotion', 'complaint_resolution', 'loyalty', 'manual')),
  source_id UUID,
  description TEXT,

  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES customer_credits(id),
  job_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Service requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,

  source TEXT NOT NULL DEFAULT 'evidly' CHECK (source IN ('evidly', 'ai_estimate', 'website', 'phone', 'email', 'referral')),
  evidly_location_id UUID,
  ai_estimate_id UUID,
  referral_code TEXT,

  organization_id UUID,
  location_id UUID,

  business_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  service_types TEXT[],
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'soon', 'urgent', 'emergency')),
  preferred_date DATE,
  preferred_time_window TEXT CHECK (preferred_time_window IN ('morning', 'afternoon', 'evening', 'anytime')),
  notes TEXT,

  ai_estimate_data JSONB,
  ai_estimated_price_low DECIMAL(10,2),
  ai_estimated_price_high DECIMAL(10,2),
  ai_estimated_hours DECIMAL(4,1),
  ai_equipment_detected JSONB,
  ai_condition_assessment TEXT,
  ai_photos JSONB,

  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'quoted', 'scheduled', 'declined', 'cancelled')),
  assigned_to UUID,

  job_id UUID,
  estimate_id UUID,

  first_response_at TIMESTAMPTZ,
  response_time_minutes INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_source ON service_requests(source);
CREATE INDEX idx_service_requests_ai_estimate ON service_requests(ai_estimate_id);

-- ── Referral campaigns ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  referrer_reward_multiplier DECIMAL(3,2) DEFAULT 1.0,
  referee_reward_multiplier DECIMAL(3,2) DEFAULT 1.0,

  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  max_referrals INTEGER,
  current_referrals INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── updated_at triggers ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_referral_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referral_codes_updated_at
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW EXECUTE FUNCTION update_referral_updated_at();

CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_referral_updated_at();

CREATE TRIGGER trg_customer_credits_updated_at
  BEFORE UPDATE ON customer_credits
  FOR EACH ROW EXECUTE FUNCTION update_referral_updated_at();

CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_referral_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_codes_vendor_access ON referral_codes
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY referrals_vendor_access ON referrals
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY credits_vendor_access ON customer_credits
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY credit_txns_vendor_access ON customer_credit_transactions
  FOR ALL USING (credit_id IN (
    SELECT id FROM customer_credits WHERE vendor_id = auth.uid() OR vendor_id IN (
      SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
    )
  ));

CREATE POLICY service_requests_vendor_access ON service_requests
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY campaigns_vendor_access ON referral_campaigns
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

-- Public access for referral code lookup
CREATE POLICY referral_codes_public_lookup ON referral_codes
  FOR SELECT USING (true);

-- Public access for service request submission
CREATE POLICY service_requests_public_submit ON service_requests
  FOR INSERT WITH CHECK (true);
