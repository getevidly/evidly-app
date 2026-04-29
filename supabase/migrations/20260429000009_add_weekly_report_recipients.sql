-- Add weekly_report_recipients table.
-- Routing config for the unified Food Safety auto-weekly report.
-- Recipients are name + email, configurable per organization or per location.
-- When location_id IS NULL the recipient receives org-wide reports.
--
-- send_day has no default — must be set by the application layer based on
-- the location's business_hours_days (added to locations in commit 11).
-- For org-wide recipients (location_id IS NULL), the application picks
-- a day common across all the org's locations, or surfaces a setup prompt
-- to the org admin. The DB does not enforce day-vs-business-hours alignment;
-- the UI is responsible for filtering invalid options.

CREATE TABLE weekly_report_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  recipient_role text,
  send_day text NOT NULL CHECK (send_day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  send_time time NOT NULL DEFAULT '08:00',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_report_recipients_organization_id ON weekly_report_recipients(organization_id);
CREATE INDEX idx_weekly_report_recipients_location_id ON weekly_report_recipients(location_id);

ALTER TABLE weekly_report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY weekly_report_recipients_select ON weekly_report_recipients FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY weekly_report_recipients_insert ON weekly_report_recipients FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY weekly_report_recipients_update ON weekly_report_recipients FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY weekly_report_recipients_delete ON weekly_report_recipients FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
