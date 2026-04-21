-- Marketing & Sales System
-- Migration: 20260529000000_marketing_sales_system.sql

-- =============================================
-- LEADS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  
  -- Lead info
  business_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Classification
  lead_source TEXT NOT NULL,
  lead_type TEXT DEFAULT 'prospect',
  industry TEXT,
  kitchen_type TEXT,
  estimated_value DECIMAL(10,2),
  estimated_monthly_value DECIMAL(10,2),
  
  -- Pipeline
  pipeline_stage TEXT DEFAULT 'new',
  probability INTEGER DEFAULT 10,
  expected_close_date DATE,
  
  -- Assignment
  assigned_to UUID,
  
  -- Tracking
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  followup_count INTEGER DEFAULT 0,
  
  -- If converted
  organization_id UUID REFERENCES organizations(id),
  first_job_id UUID,
  converted_at TIMESTAMPTZ,
  
  -- If lost
  lost_reason TEXT,
  lost_at TIMESTAMPTZ,
  
  -- Source tracking
  referral_id UUID,
  service_request_id UUID,
  campaign_id UUID,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_leads_vendor ON leads(vendor_id);

-- =============================================
-- LEAD ACTIVITIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  
  call_duration_seconds INTEGER,
  
  email_subject TEXT,
  email_opened BOOLEAN,
  email_clicked BOOLEAN,
  
  meeting_date TIMESTAMPTZ,
  meeting_location TEXT,
  
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);

-- =============================================
-- SALES GOALS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS sales_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  employee_id UUID,
  
  period_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  revenue_target DECIMAL(12,2),
  new_customers_target INTEGER,
  leads_target INTEGER,
  jobs_target INTEGER,
  
  revenue_actual DECIMAL(12,2) DEFAULT 0,
  new_customers_actual INTEGER DEFAULT 0,
  leads_actual INTEGER DEFAULT 0,
  jobs_actual INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MARKETING CAMPAIGNS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),

  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL,

  target_audience TEXT,
  target_criteria JSONB,

  status TEXT DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  subject_line TEXT,
  message_body TEXT,
  template_id UUID,

  budget DECIMAL(10,2),
  spent DECIMAL(10,2) DEFAULT 0,

  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  responded_count INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  revenue_attributed DECIMAL(12,2) DEFAULT 0,

  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconcile marketing_campaigns schema (table may exist from earlier migration)
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS target_criteria JSONB;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS subject_line TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS message_body TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2);
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS spent DECIMAL(10,2) DEFAULT 0;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS responded_count INTEGER DEFAULT 0;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS leads_generated INTEGER DEFAULT 0;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS revenue_attributed DECIMAL(12,2) DEFAULT 0;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_campaigns_vendor ON marketing_campaigns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);

-- Add FK from leads to campaigns
ALTER TABLE leads ADD CONSTRAINT fk_leads_campaign FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id);

-- =============================================
-- VIOLATION OUTREACH TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS violation_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  campaign_id UUID REFERENCES marketing_campaigns(id),
  
  source TEXT NOT NULL,
  source_url TEXT,
  violation_date DATE,
  violation_type TEXT,
  
  business_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  
  status TEXT DEFAULT 'pending',
  outreach_method TEXT,
  outreach_count INTEGER DEFAULT 0,
  last_outreach_at TIMESTAMPTZ,
  
  lead_id UUID REFERENCES leads(id),
  organization_id UUID REFERENCES organizations(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violation_outreach_vendor ON violation_outreach(vendor_id);
CREATE INDEX IF NOT EXISTS idx_violation_outreach_status ON violation_outreach(status);

-- =============================================
-- OUTREACH SEQUENCES
-- =============================================

CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  
  step_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  
  action_type TEXT NOT NULL,
  template_id UUID,
  subject TEXT,
  message TEXT,
  
  skip_if TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id),
  lead_id UUID REFERENCES leads(id),
  organization_id UUID REFERENCES organizations(id),
  
  status TEXT DEFAULT 'active',
  current_step INTEGER DEFAULT 0,
  
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  stopped_reason TEXT
);

-- =============================================
-- AGREEMENT TEMPLATES
-- =============================================

CREATE TABLE IF NOT EXISTS agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  
  name TEXT NOT NULL,
  description TEXT,
  
  content_html TEXT NOT NULL,
  content_json JSONB,
  
  default_term_months INTEGER DEFAULT 12,
  default_payment_terms TEXT DEFAULT 'net_30',
  default_auto_renew BOOLEAN DEFAULT true,
  default_cancellation_days INTEGER DEFAULT 30,
  
  default_services JSONB,
  
  terms_and_conditions TEXT,
  liability_limit DECIMAL(12,2),
  insurance_requirements TEXT,
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SERVICE AGREEMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS service_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  template_id UUID REFERENCES agreement_templates(id),
  
  agreement_number TEXT NOT NULL UNIQUE,
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_ids UUID[],
  
  signer_name TEXT,
  signer_title TEXT,
  signer_email TEXT,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  term_months INTEGER NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  cancellation_notice_days INTEGER DEFAULT 30,
  
  pricing_type TEXT DEFAULT 'per_service',
  monthly_amount DECIMAL(10,2),
  annual_amount DECIMAL(10,2),
  
  services JSONB NOT NULL,
  
  payment_terms TEXT DEFAULT 'net_30',
  billing_frequency TEXT DEFAULT 'per_service',
  
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_reason TEXT,
  
  status TEXT DEFAULT 'draft',
  
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_ip TEXT,
  signature_data JSONB,
  
  pdf_url TEXT,
  signed_pdf_url TEXT,
  
  renewed_from_id UUID REFERENCES service_agreements(id),
  renewed_to_id UUID REFERENCES service_agreements(id),
  renewal_reminder_sent BOOLEAN DEFAULT false,
  
  created_by UUID,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreements_org ON service_agreements(organization_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON service_agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_dates ON service_agreements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_agreements_vendor ON service_agreements(vendor_id);

-- =============================================
-- AGREEMENT ACTIVITIES
-- =============================================

CREATE TABLE IF NOT EXISTS agreement_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL,
  description TEXT,
  performed_by UUID,
  ip_address TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreement_activities ON agreement_activities(agreement_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE violation_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_activities ENABLE ROW LEVEL SECURITY;

-- Service role policies
DROP POLICY IF EXISTS leads_service ON leads;
CREATE POLICY leads_service ON leads FOR ALL USING (true);
DROP POLICY IF EXISTS lead_activities_service ON lead_activities;
CREATE POLICY lead_activities_service ON lead_activities FOR ALL USING (true);
DROP POLICY IF EXISTS sales_goals_service ON sales_goals;
CREATE POLICY sales_goals_service ON sales_goals FOR ALL USING (true);
DROP POLICY IF EXISTS campaigns_service ON marketing_campaigns;
CREATE POLICY campaigns_service ON marketing_campaigns FOR ALL USING (true);
DROP POLICY IF EXISTS violation_outreach_service ON violation_outreach;
CREATE POLICY violation_outreach_service ON violation_outreach FOR ALL USING (true);
DROP POLICY IF EXISTS sequences_service ON outreach_sequences;
CREATE POLICY sequences_service ON outreach_sequences FOR ALL USING (true);
DROP POLICY IF EXISTS sequence_steps_service ON outreach_sequence_steps;
CREATE POLICY sequence_steps_service ON outreach_sequence_steps FOR ALL USING (true);
DROP POLICY IF EXISTS enrollments_service ON outreach_enrollments;
CREATE POLICY enrollments_service ON outreach_enrollments FOR ALL USING (true);
DROP POLICY IF EXISTS agreement_templates_service ON agreement_templates;
CREATE POLICY agreement_templates_service ON agreement_templates FOR ALL USING (true);
DROP POLICY IF EXISTS agreements_service ON service_agreements;
CREATE POLICY agreements_service ON service_agreements FOR ALL USING (true);
DROP POLICY IF EXISTS agreement_activities_service ON agreement_activities;
CREATE POLICY agreement_activities_service ON agreement_activities FOR ALL USING (true);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_violation_outreach_updated_at ON violation_outreach;
CREATE TRIGGER update_violation_outreach_updated_at BEFORE UPDATE ON violation_outreach FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_agreement_templates_updated_at ON agreement_templates;
CREATE TRIGGER update_agreement_templates_updated_at BEFORE UPDATE ON agreement_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_agreements_updated_at ON service_agreements;
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON service_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_sales_goals_updated_at ON sales_goals;
CREATE TRIGGER update_sales_goals_updated_at BEFORE UPDATE ON sales_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
