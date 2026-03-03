-- TRAINING-RECORDS-1: Training assignments and certification reminders tables

-- ── training_assignments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL,
  assigned_by       uuid NOT NULL,
  training_name     text NOT NULL,
  training_type     text NOT NULL DEFAULT 'internal'
    CHECK (training_type IN ('food_handler', 'servsafe', 'allergen', 'internal', 'custom', 'facility_safety')),
  due_date          date NOT NULL,
  notes             text,
  status            text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue', 'cancelled')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'training_assignments_read_own_org') THEN
    CREATE POLICY training_assignments_read_own_org ON training_assignments
      FOR SELECT USING (
        organization_id IN (
          SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'training_assignments_write_managers') THEN
    CREATE POLICY training_assignments_write_managers ON training_assignments
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM user_profiles
          WHERE id = auth.uid()
            AND role IN ('owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'platform_admin')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_assignments_org_emp
  ON training_assignments(organization_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_training_assignments_status
  ON training_assignments(status) WHERE status != 'completed';


-- ── certification_reminders ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certification_reminders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL,
  cert_type         text NOT NULL,
  cert_name         text NOT NULL,
  expiration_date   date NOT NULL,
  reminder_type     text NOT NULL
    CHECK (reminder_type IN ('60_day', '30_day', 'expiration', 'escalation')),
  scheduled_date    date NOT NULL,
  sent_at           timestamptz,
  acknowledged_at   timestamptz,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'acknowledged', 'snoozed', 'resolved')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE certification_reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cert_reminders_read_own_org') THEN
    CREATE POLICY cert_reminders_read_own_org ON certification_reminders
      FOR SELECT USING (
        organization_id IN (
          SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cert_reminders_write_service') THEN
    CREATE POLICY cert_reminders_write_service ON certification_reminders
      FOR ALL USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
          SELECT organization_id FROM user_profiles
          WHERE id = auth.uid()
            AND role IN ('owner_operator', 'executive', 'compliance_manager', 'platform_admin')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cert_reminders_org_emp
  ON certification_reminders(organization_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_cert_reminders_scheduled
  ON certification_reminders(scheduled_date) WHERE status = 'pending';
