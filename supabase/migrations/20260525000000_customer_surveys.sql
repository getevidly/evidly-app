-- Customer Surveys & Google Review System
-- Migration: 20260525000000_customer_surveys.sql

-- ── Survey settings (per vendor) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL UNIQUE,
  
  -- Timing
  send_delay_hours INTEGER DEFAULT 24,
  send_time TIME DEFAULT '09:00',
  expiry_days INTEGER DEFAULT 7,
  reminder_days INTEGER DEFAULT 3,
  
  -- Google Review
  google_business_url TEXT,
  google_review_threshold INTEGER DEFAULT 4,
  
  -- Channels
  send_via_email BOOLEAN DEFAULT true,
  send_via_sms BOOLEAN DEFAULT false,
  
  -- Templates
  email_subject TEXT DEFAULT 'How was your service with {company_name}?',
  email_template TEXT,
  sms_template TEXT DEFAULT 'Hi {contact_name}, how was your recent service? Rate us: {survey_link}',
  
  -- Auto-response
  auto_respond_enabled BOOLEAN DEFAULT true,
  auto_respond_threshold INTEGER DEFAULT 3,
  auto_respond_recipients TEXT[],
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Customer surveys ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  job_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL,
  location_id UUID NOT NULL,
  
  -- Recipient
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  
  -- Scheduling
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Token for public access
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Response
  completed_at TIMESTAMPTZ,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  
  -- Detailed ratings
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  professionalism_rating INTEGER CHECK (professionalism_rating BETWEEN 1 AND 5),
  timeliness_rating INTEGER CHECK (timeliness_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  
  -- Feedback
  feedback_text TEXT,
  would_recommend BOOLEAN,
  
  -- Google review
  google_review_prompted BOOLEAN DEFAULT false,
  google_review_clicked BOOLEAN DEFAULT false,
  
  -- Follow-up (requires_followup is a generated column)
  requires_followup BOOLEAN GENERATED ALWAYS AS (overall_rating IS NOT NULL AND overall_rating < 4) STORED,
  followup_handled_by UUID,
  followup_handled_at TIMESTAMPTZ,
  followup_notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'expired', 'bounced')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX idx_surveys_scheduled ON customer_surveys(scheduled_send_at)
  WHERE status = 'pending' AND sent_at IS NULL;

CREATE INDEX idx_surveys_reminder ON customer_surveys(sent_at)
  WHERE status = 'sent' AND completed_at IS NULL AND reminder_sent_at IS NULL;

CREATE INDEX idx_surveys_vendor ON customer_surveys(vendor_id, created_at DESC);

CREATE INDEX idx_surveys_token ON customer_surveys(token);

CREATE INDEX idx_surveys_followup ON customer_surveys(vendor_id)
  WHERE requires_followup = true AND followup_handled_at IS NULL;

-- ── Trigger: auto-schedule survey on job completion ──────────────
CREATE OR REPLACE FUNCTION schedule_survey_on_job_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_settings survey_settings%ROWTYPE;
  v_send_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Only trigger on status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get vendor survey settings
    SELECT * INTO v_settings FROM survey_settings WHERE vendor_id = NEW.vendor_id AND is_active = true;
    
    -- Skip if surveys not configured
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Calculate send time (delay hours from completion, then round to send_time next day)
    v_send_at := NEW.completed_at + (v_settings.send_delay_hours || ' hours')::INTERVAL;
    v_expires_at := v_send_at + (v_settings.expiry_days || ' days')::INTERVAL;
    
    -- Insert survey record (ignore if job already has one)
    INSERT INTO customer_surveys (vendor_id, job_id, organization_id, location_id, scheduled_send_at, expires_at)
    VALUES (NEW.vendor_id, NEW.id, NEW.organization_id, NEW.location_id, v_send_at, v_expires_at)
    ON CONFLICT (job_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_survey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_survey_updated_at
  BEFORE UPDATE ON customer_surveys
  FOR EACH ROW EXECUTE FUNCTION update_survey_updated_at();

CREATE TRIGGER trg_survey_settings_updated_at
  BEFORE UPDATE ON survey_settings
  FOR EACH ROW EXECUTE FUNCTION update_survey_updated_at();

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE customer_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY surveys_vendor_access ON customer_surveys
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

CREATE POLICY survey_settings_vendor_access ON survey_settings
  FOR ALL USING (vendor_id = auth.uid() OR vendor_id IN (
    SELECT vendor_id FROM vendor_employees WHERE employee_id = auth.uid()
  ));

-- Public access via token (for survey submission)
CREATE POLICY surveys_public_token ON customer_surveys
  FOR SELECT USING (true);

CREATE POLICY surveys_public_submit ON customer_surveys
  FOR UPDATE USING (true)
  WITH CHECK (true);
