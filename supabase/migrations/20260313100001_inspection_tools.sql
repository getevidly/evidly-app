-- ═══════════════════════════════════════════════════════════════════
-- INSPECTION-TOOLS-01 — Self-Inspection & Mock Inspection sessions
-- ═══════════════════════════════════════════════════════════════════

-- ── Self Inspection Sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS self_inspection_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id    uuid REFERENCES locations(id) ON DELETE SET NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  jurisdiction_key text,
  scoring_type   text,
  score          numeric,
  grade          text,
  sections_json  jsonb,
  failed_items_json jsonb,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE self_inspection_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sessions"
  ON self_inspection_sessions FOR SELECT
  USING (org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org sessions"
  ON self_inspection_sessions FOR INSERT
  WITH CHECK (org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ── Mock Inspection Sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_inspection_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id    uuid REFERENCES locations(id) ON DELETE SET NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  jurisdiction_key text,
  difficulty     text CHECK (difficulty IN ('routine', 'focused', 'critical')),
  score          numeric,
  grade          text,
  questions_json jsonb,
  violations_found integer DEFAULT 0,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE mock_inspection_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org mock sessions"
  ON mock_inspection_sessions FOR SELECT
  USING (org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org mock sessions"
  ON mock_inspection_sessions FOR INSERT
  WITH CHECK (org_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX idx_self_inspection_sessions_org ON self_inspection_sessions(org_id);
CREATE INDEX idx_self_inspection_sessions_location ON self_inspection_sessions(location_id);
CREATE INDEX idx_mock_inspection_sessions_org ON mock_inspection_sessions(org_id);
CREATE INDEX idx_mock_inspection_sessions_location ON mock_inspection_sessions(location_id);
