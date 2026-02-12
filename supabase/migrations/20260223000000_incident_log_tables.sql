-- Incident Log System Tables
-- Stores incidents, timeline entries, and comments for compliance incident tracking

-- ── incidents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  incident_number TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('temperature_violation','checklist_failure','health_citation','equipment_failure','pest_sighting','customer_complaint','staff_safety','other')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical','major','minor')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_name TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','assigned','in_progress','resolved','verified')),
  assigned_to TEXT,
  reported_by TEXT NOT NULL,
  corrective_action TEXT,
  action_chips TEXT[],
  resolution_summary TEXT,
  root_cause VARCHAR(20) CHECK (root_cause IN ('equipment','training','process','vendor','external','unknown')),
  source_type VARCHAR(20),
  source_id UUID,
  source_label TEXT,
  photos JSONB NOT NULL DEFAULT '[]',
  resolution_photos JSONB NOT NULL DEFAULT '[]',
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_org ON incidents(organization_id);
CREATE INDEX idx_incidents_org_status ON incidents(organization_id, status);
CREATE INDEX idx_incidents_location ON incidents(location_id);
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org incidents"
  ON incidents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org incidents"
  ON incidents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org incidents"
  ON incidents FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role full access incidents"
  ON incidents FOR ALL TO service_role USING (true);

-- ── incident_timeline ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  performed_by TEXT NOT NULL,
  notes TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_timeline_incident ON incident_timeline(incident_id, created_at DESC);
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline via incident org"
  ON incident_timeline FOR SELECT TO authenticated
  USING (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert timeline via incident org"
  ON incident_timeline FOR INSERT TO authenticated
  WITH CHECK (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update timeline via incident org"
  ON incident_timeline FOR UPDATE TO authenticated
  USING (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Service role full access incident timeline"
  ON incident_timeline FOR ALL TO service_role USING (true);

-- ── incident_comments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incident_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_comments_incident ON incident_comments(incident_id, created_at DESC);
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments via incident org"
  ON incident_comments FOR SELECT TO authenticated
  USING (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert comments via incident org"
  ON incident_comments FOR INSERT TO authenticated
  WITH CHECK (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update comments via incident org"
  ON incident_comments FOR UPDATE TO authenticated
  USING (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Service role full access incident comments"
  ON incident_comments FOR ALL TO service_role USING (true);

-- ── Updated at trigger ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_incidents_updated_at();
