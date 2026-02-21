-- ================================================================
-- Vendor Service Reminder System
-- Tracks upcoming vendor service dates and reminder cadence:
-- 30d, 14d, 7d, 3d, 1d before due date + overdue at +7 days
-- ================================================================

-- 1. vendor_service_records — upcoming and completed vendor services with reminder tracking
CREATE TABLE IF NOT EXISTS vendor_service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  service_type VARCHAR(100) NOT NULL,
  service_due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'completed', 'overdue', 'cancelled')),

  -- Reminder tracking columns (one per window — null = not yet sent)
  reminder_30d_sent_at TIMESTAMPTZ,
  reminder_14d_sent_at TIMESTAMPTZ,
  reminder_7d_sent_at  TIMESTAMPTZ,
  reminder_3d_sent_at  TIMESTAMPTZ,
  reminder_1d_sent_at  TIMESTAMPTZ,

  -- Client-facing alerts
  client_due_day_alert_at TIMESTAMPTZ,   -- Day 0: "Service is due today"
  overdue_7d_alert_at     TIMESTAMPTZ,   -- Day +7: "Service is 7 days overdue"

  -- Completion tracking
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  certificate_document_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_vsr_org ON vendor_service_records(organization_id);
CREATE INDEX idx_vsr_vendor ON vendor_service_records(vendor_id);
CREATE INDEX idx_vsr_due_date ON vendor_service_records(service_due_date) WHERE status = 'upcoming';
CREATE INDEX idx_vsr_status ON vendor_service_records(status);
CREATE INDEX idx_vsr_location ON vendor_service_records(location_id);
CREATE INDEX idx_vsr_equipment ON vendor_service_records(equipment_id) WHERE equipment_id IS NOT NULL;

-- RLS
ALTER TABLE vendor_service_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org vendor service records"
  ON vendor_service_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org vendor service records"
  ON vendor_service_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org vendor service records"
  ON vendor_service_records FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access vendor service records"
  ON vendor_service_records FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 2. vendor_service_reminder_log — audit trail of all reminders sent
CREATE TABLE IF NOT EXISTS vendor_service_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id UUID NOT NULL REFERENCES vendor_service_records(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  reminder_type VARCHAR(20) NOT NULL,   -- 'reminder_30d', 'reminder_14d', 'reminder_7d', 'reminder_3d', 'reminder_1d', 'due_today', 'overdue_7d'
  urgency VARCHAR(10) NOT NULL,         -- 'low', 'medium', 'high'
  sent_via VARCHAR(10) NOT NULL,        -- 'email', 'sms', 'both'
  recipient_type VARCHAR(10) NOT NULL DEFAULT 'vendor',  -- 'vendor' or 'client'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vsrl_service ON vendor_service_reminder_log(service_record_id);
CREATE INDEX idx_vsrl_org ON vendor_service_reminder_log(organization_id);
CREATE INDEX idx_vsrl_vendor ON vendor_service_reminder_log(vendor_id);

ALTER TABLE vendor_service_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vendor service reminder log"
  ON vendor_service_reminder_log FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role full access vendor service reminder log"
  ON vendor_service_reminder_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
