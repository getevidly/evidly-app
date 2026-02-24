/*
  # Feature Overrides Table
  Per-account feature flag overrides that take precedence over tier defaults.
  Used by the admin kill-switch system in src/lib/featureGating.ts.
*/

CREATE TABLE IF NOT EXISTS feature_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  feature_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, feature_id)
);

ALTER TABLE feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orgs can read own overrides" ON feature_overrides
  FOR SELECT USING (org_id = (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role manages overrides" ON feature_overrides
  FOR ALL TO service_role USING (true);

COMMENT ON TABLE feature_overrides IS 'Per-account feature flag overrides. Takes precedence over tier defaults.';

CREATE INDEX IF NOT EXISTS idx_feature_overrides_org ON feature_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_feature_overrides_feature ON feature_overrides(feature_id);
