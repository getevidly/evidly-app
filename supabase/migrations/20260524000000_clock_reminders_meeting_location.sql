-- ============================================================
-- CLOCK-REMINDERS & MEETING-LOCATION
-- Part 13: Clock In/Out Reminders & Auto Clock-Out
-- Part 14: Job Meeting Location
-- ============================================================

-- ── Part 13: Auto clock-out columns on time_entries (skip if table doesn't exist) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    ALTER TABLE time_entries
      ADD COLUMN IF NOT EXISTS auto_clocked_out BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_clockout_reason TEXT;
    COMMENT ON COLUMN time_entries.auto_clocked_out IS 'True when the system auto-clocked out the employee';
    COMMENT ON COLUMN time_entries.auto_clockout_reason IS 'Reason for auto clock-out: geofence_exit | idle_timeout | end_of_day';
  END IF;
END $$;

-- ── Part 13: Clock reminder settings on vendor_settings (skip if table doesn't exist) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_settings') THEN
    ALTER TABLE vendor_settings
      ADD COLUMN IF NOT EXISTS clock_in_reminder_minutes INT DEFAULT 15,
      ADD COLUMN IF NOT EXISTS clock_out_reminder_minutes INT DEFAULT 15,
      ADD COLUMN IF NOT EXISTS auto_clockout_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_clockout_minutes INT DEFAULT 15,
      ADD COLUMN IF NOT EXISTS geofence_radius_meters INT DEFAULT 100;
    COMMENT ON COLUMN vendor_settings.clock_in_reminder_minutes IS 'Minutes before job start to send clock-in reminder';
    COMMENT ON COLUMN vendor_settings.clock_out_reminder_minutes IS 'Minutes after job end to send clock-out reminder';
    COMMENT ON COLUMN vendor_settings.auto_clockout_enabled IS 'Enable geofence-based auto clock-out';
    COMMENT ON COLUMN vendor_settings.auto_clockout_minutes IS 'Minutes after leaving geofence to auto clock-out';
    COMMENT ON COLUMN vendor_settings.geofence_radius_meters IS 'Radius in meters for job-site geofence';
  END IF;
END $$;

-- ── Part 13: Clock reminder log table ────────────────────────

CREATE TABLE IF NOT EXISTS clock_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID,
  job_id UUID,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('clock_in', 'clock_out', 'auto_clockout_warning')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clock_reminders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_clock_reminders_employee ON clock_reminders(employee_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_clock_reminders_org ON clock_reminders(org_id, reminder_type);

-- ── Part 14: Meeting location columns on scheduled_jobs (skip if table doesn't exist) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_jobs') THEN
    ALTER TABLE scheduled_jobs
      ADD COLUMN IF NOT EXISTS meeting_location TEXT,
      ADD COLUMN IF NOT EXISTS meeting_location_notes TEXT,
      ADD COLUMN IF NOT EXISTS meeting_location_lat DECIMAL(10,8),
      ADD COLUMN IF NOT EXISTS meeting_location_lng DECIMAL(11,8);
    COMMENT ON COLUMN scheduled_jobs.meeting_location IS 'Where team meets before heading to job site';
    COMMENT ON COLUMN scheduled_jobs.meeting_location_notes IS 'Additional meeting point instructions';
    COMMENT ON COLUMN scheduled_jobs.meeting_location_lat IS 'Meeting location latitude';
    COMMENT ON COLUMN scheduled_jobs.meeting_location_lng IS 'Meeting location longitude';
  END IF;
END $$;

-- ── Part 14: Timecard alterations audit log ──────────────────

CREATE TABLE IF NOT EXISTS timecard_alterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  time_entry_id UUID NOT NULL,
  altered_by UUID,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE timecard_alterations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_timecard_alterations_entry ON timecard_alterations(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_timecard_alterations_org ON timecard_alterations(org_id, created_at DESC);
