-- TRIAL-EMAIL-ADMIN-01: Trial email sequences, send log, and vendor outreach pipeline

-- Trial email sequence definitions
CREATE TABLE IF NOT EXISTS trial_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INTEGER NOT NULL,
  trigger_day INTEGER NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trial email send log (one row per email sent)
CREATE TABLE IF NOT EXISTS trial_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  sequence_step_id UUID REFERENCES trial_email_sequences(id),
  recipient_email TEXT NOT NULL,
  resend_message_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ
);

-- Vendor outreach pipeline
CREATE TABLE IF NOT EXISTS vendor_outreach_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'contacted', 'interested', 'onboarding', 'active', 'inactive')),
  contact_email TEXT,
  contact_phone TEXT,
  last_touch_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trial_email_log_org ON trial_email_log(org_id);
CREATE INDEX IF NOT EXISTS idx_trial_email_log_resend ON trial_email_log(resend_message_id);
CREATE INDEX IF NOT EXISTS idx_vendor_outreach_stage ON vendor_outreach_pipeline(stage);
