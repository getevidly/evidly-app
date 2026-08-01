-- county_briefing_approvals — approval gate for county briefing emails.
-- No briefing sends until content is manually approved. Approval auto-lapses
-- when the underlying jurisdiction data changes (hash mismatch).
CREATE TABLE IF NOT EXISTS county_briefing_approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county            TEXT NOT NULL,
  state_code        TEXT NOT NULL DEFAULT 'CA',
  jurisdiction_id   UUID REFERENCES jurisdictions(id) ON DELETE SET NULL,
  approved_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  jurisdiction_hash TEXT NOT NULL,
  lapsed_at         TIMESTAMPTZ,
  lapse_reason      TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(county, state_code)
);

ALTER TABLE county_briefing_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON county_briefing_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY platform_admin_read ON county_briefing_approvals
  FOR SELECT TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'platform_admin'
  );

CREATE INDEX idx_cba_county_state ON county_briefing_approvals(county, state_code);
CREATE INDEX idx_cba_jurisdiction ON county_briefing_approvals(jurisdiction_id);

-- county_briefing_recipients — outbound queue for county briefing emails.
CREATE TABLE IF NOT EXISTS county_briefing_recipients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  first_name  TEXT,
  org_name    TEXT,
  county      TEXT NOT NULL,
  state_code  TEXT NOT NULL DEFAULT 'CA',
  variant     TEXT NOT NULL DEFAULT 'cold' CHECK (variant IN ('cold', 'warm')),
  approval_id UUID REFERENCES county_briefing_approvals(id) ON DELETE SET NULL,
  sent_at     TIMESTAMPTZ,
  resend_id   TEXT,
  status      TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'held')),
  hold_reason TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE county_briefing_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON county_briefing_recipients
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY platform_admin_read ON county_briefing_recipients
  FOR SELECT TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'platform_admin'
  );

CREATE INDEX idx_cbr_county_state ON county_briefing_recipients(county, state_code);
CREATE INDEX idx_cbr_email_county ON county_briefing_recipients(email, county);
CREATE INDEX idx_cbr_status ON county_briefing_recipients(status);
CREATE UNIQUE INDEX idx_cbr_dedup_sent ON county_briefing_recipients(email, county)
  WHERE status = 'sent';
