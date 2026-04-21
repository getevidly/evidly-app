-- ============================================================
-- WEEKLY AVAILABILITY SUBMISSION SYSTEM
-- Tables: availability_submissions
-- Alters: employee_availability (add submission_id, week_start)
-- ============================================================

-- 1. Availability Submissions
CREATE TABLE IF NOT EXISTS availability_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  employee_id UUID NOT NULL,
  week_start DATE NOT NULL, -- Monday of the week this availability is FOR
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','late','approved','rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  preferred_areas TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, employee_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_avail_sub_employee ON availability_submissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_avail_sub_week ON availability_submissions(week_start);
CREATE INDEX IF NOT EXISTS idx_avail_sub_status ON availability_submissions(status);
CREATE INDEX IF NOT EXISTS idx_avail_sub_vendor_week ON availability_submissions(vendor_id, week_start);

-- 2. Update employee_availability with submission reference (skip if table doesn't exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_availability') THEN
    ALTER TABLE employee_availability
      ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES availability_submissions(id),
      ADD COLUMN IF NOT EXISTS week_start DATE;
    CREATE INDEX IF NOT EXISTS idx_emp_avail_submission ON employee_availability(submission_id);
    CREATE INDEX IF NOT EXISTS idx_emp_avail_week ON employee_availability(week_start);
  END IF;
END $$;

-- 3. RLS policies
ALTER TABLE availability_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own submissions" ON availability_submissions;
CREATE POLICY "Employees can view own submissions"
  ON availability_submissions FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('owner_operator','executive','compliance_manager','kitchen_manager')
    )
  );

DROP POLICY IF EXISTS "Employees can insert own submissions" ON availability_submissions;
CREATE POLICY "Employees can insert own submissions"
  ON availability_submissions FOR INSERT
  WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "Employees can update own pending submissions" ON availability_submissions;
CREATE POLICY "Employees can update own pending submissions"
  ON availability_submissions FOR UPDATE
  USING (
    (employee_id = auth.uid() AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('owner_operator','executive','compliance_manager','kitchen_manager')
    )
  );
