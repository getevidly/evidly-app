-- M19: CREATE TABLE calendar_events (full schema + lifecycle columns)
-- Gap: G4 from ANSWER-LINE-PATTERN.md §8
-- CRITICAL: Table does not exist in PROD. Migration 20260301000000 was never applied.
-- This migration supersedes 20260301000000_calendar_events.sql.

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'vendor',
  category TEXT,
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  rescheduled_from DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_status_check
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'rescheduled')),
  CONSTRAINT calendar_events_completed_requires_fields
    CHECK (
      (status <> 'completed') OR
      (completed_at IS NOT NULL AND completed_by IS NOT NULL)
    ),
  CONSTRAINT calendar_events_rescheduled_requires_from
    CHECK (
      (status <> 'rescheduled') OR
      (rescheduled_from IS NOT NULL)
    )
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage calendar events in their org" ON calendar_events;
CREATE POLICY "Users can manage calendar events in their org" ON calendar_events
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_date
  ON calendar_events(organization_id, date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_status
  ON calendar_events(organization_id, status)
  WHERE status IN ('scheduled', 'in_progress', 'missed');

COMMENT ON TABLE calendar_events IS
  'Calendar events for facility safety and vendor service scheduling. Status lifecycle: scheduled -> in_progress -> completed | missed | rescheduled.';

COMMENT ON COLUMN calendar_events.status IS
  'Event lifecycle status. Derived client-side in ANSWER-LINE-PATTERN.md S2.5, persisted here for query efficiency.';

COMMENT ON COLUMN calendar_events.rescheduled_from IS
  'Original date before reschedule. Set when status transitions to rescheduled. A new event row is created for the new date.';
