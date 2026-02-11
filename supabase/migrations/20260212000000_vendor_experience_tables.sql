-- ================================================================
-- Vendor Experience Tables
-- Vendor certification tracking, subscriptions, quotes, service
-- completions, messaging, lead management, and daily analytics
-- ================================================================

-- 1. vendor_certification_status — vendor tier and evaluation tracking
CREATE TABLE IF NOT EXISTS vendor_certification_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  tier varchar(20) DEFAULT 'listed' CHECK (tier IN ('listed', 'verified', 'certified', 'preferred')),
  qualified_since timestamptz,
  last_evaluated timestamptz DEFAULT now(),
  next_evaluation timestamptz,
  criteria_met jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. vendor_subscriptions — billing plan and Stripe subscription tracking
CREATE TABLE IF NOT EXISTS vendor_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  plan varchar(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'premium', 'per_lead')),
  stripe_subscription_id text,
  status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. service_quotes — vendor quotes for service requests
CREATE TABLE IF NOT EXISTS service_quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_request_id uuid NOT NULL REFERENCES marketplace_service_requests(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount numeric(10,2),
  description text,
  valid_until date,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. service_completions — records of completed vendor services
CREATE TABLE IF NOT EXISTS service_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_request_id uuid REFERENCES marketplace_service_requests(id) ON DELETE SET NULL,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  location_id uuid,
  service_date date NOT NULL,
  service_type varchar(100),
  notes text,
  photos jsonb DEFAULT '[]'::jsonb,
  documents_uploaded jsonb DEFAULT '[]'::jsonb,
  compliance_records_updated jsonb DEFAULT '[]'::jsonb,
  status varchar(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'verified')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. vendor_messages — conversation messages between vendors, operators, and system
CREATE TABLE IF NOT EXISTS vendor_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL,
  sender_type varchar(20) NOT NULL CHECK (sender_type IN ('vendor', 'operator', 'system')),
  sender_id uuid NOT NULL,
  message_text text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 6. vendor_leads — lead tracking and fee management
CREATE TABLE IF NOT EXISTS vendor_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  service_request_id uuid REFERENCES marketplace_service_requests(id) ON DELETE SET NULL,
  lead_type varchar(20) DEFAULT 'quote_request' CHECK (lead_type IN ('quote_request', 'scheduled_service')),
  fee_amount numeric(10,2) DEFAULT 0,
  fee_status varchar(20) DEFAULT 'pending' CHECK (fee_status IN ('pending', 'charged', 'waived', 'refunded')),
  created_at timestamptz DEFAULT now()
);

-- 7. vendor_analytics — daily aggregated vendor performance metrics
CREATE TABLE IF NOT EXISTS vendor_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date date NOT NULL,
  profile_views integer DEFAULT 0,
  quote_requests integer DEFAULT 0,
  quotes_sent integer DEFAULT 0,
  quotes_accepted integer DEFAULT 0,
  services_completed integer DEFAULT 0,
  revenue_through_platform numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, date)
);

-- =====================================================
-- Indexes
-- =====================================================

-- vendor_certification_status indexes
CREATE INDEX idx_vcs_vendor ON vendor_certification_status(vendor_id);
CREATE INDEX idx_vcs_tier ON vendor_certification_status(tier);
CREATE INDEX idx_vcs_next_eval ON vendor_certification_status(next_evaluation);

-- vendor_subscriptions indexes
CREATE INDEX idx_vsub_vendor ON vendor_subscriptions(vendor_id);
CREATE INDEX idx_vsub_status ON vendor_subscriptions(status);
CREATE INDEX idx_vsub_stripe ON vendor_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- service_quotes indexes
CREATE INDEX idx_sq_service_request ON service_quotes(service_request_id);
CREATE INDEX idx_sq_vendor ON service_quotes(vendor_id);
CREATE INDEX idx_sq_status ON service_quotes(status);

-- service_completions indexes
CREATE INDEX idx_sc_service_request ON service_completions(service_request_id);
CREATE INDEX idx_sc_vendor ON service_completions(vendor_id);
CREATE INDEX idx_sc_location ON service_completions(location_id);
CREATE INDEX idx_sc_status ON service_completions(status);
CREATE INDEX idx_sc_service_date ON service_completions(service_date);

-- vendor_messages indexes
CREATE INDEX idx_vm_conversation ON vendor_messages(conversation_id, created_at);
CREATE INDEX idx_vm_sender ON vendor_messages(sender_id);
CREATE INDEX idx_vm_unread ON vendor_messages(conversation_id) WHERE read_at IS NULL;

-- vendor_leads indexes
CREATE INDEX idx_vl_vendor ON vendor_leads(vendor_id);
CREATE INDEX idx_vl_service_request ON vendor_leads(service_request_id);
CREATE INDEX idx_vl_fee_status ON vendor_leads(fee_status);

-- vendor_analytics indexes
CREATE INDEX idx_va_vendor ON vendor_analytics(vendor_id);
CREATE INDEX idx_va_date ON vendor_analytics(date);
CREATE INDEX idx_va_vendor_date ON vendor_analytics(vendor_id, date DESC);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE vendor_certification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies: authenticated SELECT for all tables
-- =====================================================

CREATE POLICY "Authenticated users can read vendor certification status"
  ON vendor_certification_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read vendor subscriptions"
  ON vendor_subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read service quotes"
  ON service_quotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read service completions"
  ON service_completions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read vendor messages"
  ON vendor_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read vendor leads"
  ON vendor_leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read vendor analytics"
  ON vendor_analytics FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- RLS Policies: service_role full access for all tables
-- =====================================================

CREATE POLICY "Service role has full access to vendor certification status"
  ON vendor_certification_status FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to vendor subscriptions"
  ON vendor_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to service quotes"
  ON service_quotes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to service completions"
  ON service_completions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to vendor messages"
  ON vendor_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to vendor leads"
  ON vendor_leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to vendor analytics"
  ON vendor_analytics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- RLS Policies: INSERT for vendor_messages and service_quotes
-- =====================================================

CREATE POLICY "Authenticated users can insert service quotes"
  ON service_quotes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert vendor messages"
  ON vendor_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);
