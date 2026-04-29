-- Add report_runs audit table for unified Food Safety report engine.
-- Powers BOTH the on-demand unified Food Safety report builder
-- (user picks modules, date range, locations, format, recipients)
-- AND the auto-weekly job (driven by weekly_report_recipients from
-- commit 9). Same engine, same audit trail.
--
-- Each row represents one report generation. Tracks:
--   - generation_type: 'on_demand' or 'auto_weekly'
--   - modules_included: text array of which Food Safety modules were
--     included in this run (temperature_logs, cooldown, receiving,
--     checklists, corrective_actions, etc.)
--   - filter_*: optional filter arrays applied to narrow the report
--   - output_formats: text array — pdf, csv, or both (zipped)
--   - output_zip_url / output_pdf_url / output_csv_url: storage URLs
--     of the generated artifacts
--   - delivered_to_emails / delivered_at: delivery audit
--   - status lifecycle: queued -> generating -> delivered or failed
--
-- Org-scoped RLS: any user in the org can see all report runs for the
-- org. SELECT/INSERT/UPDATE policies; no DELETE — audit rows are
-- immutable once created. Updates are limited to status transitions
-- and adding output URLs as the engine completes generation.

CREATE TYPE report_status AS ENUM ('queued','generating','delivered','failed');

CREATE TABLE report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  generated_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  generation_type text NOT NULL CHECK (generation_type IN ('on_demand','auto_weekly')),
  modules_included text[] NOT NULL,
  date_range_start timestamptz NOT NULL,
  date_range_end timestamptz NOT NULL,
  filter_locations uuid[],
  filter_zones uuid[],
  filter_reading_types text[],
  filter_ccp_numbers smallint[],
  output_formats text[] NOT NULL,
  output_zip_url text,
  output_pdf_url text,
  output_csv_url text,
  delivered_to_emails text[],
  delivered_at timestamptz,
  status report_status NOT NULL DEFAULT 'queued',
  error_message text,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_runs_organization_id ON report_runs(organization_id);
CREATE INDEX idx_report_runs_location_id ON report_runs(location_id);
CREATE INDEX idx_report_runs_generated_by ON report_runs(generated_by);
CREATE INDEX idx_report_runs_created_at ON report_runs(created_at DESC);
CREATE INDEX idx_report_runs_status ON report_runs(status);

ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_runs_select ON report_runs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY report_runs_insert ON report_runs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY report_runs_update ON report_runs FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
