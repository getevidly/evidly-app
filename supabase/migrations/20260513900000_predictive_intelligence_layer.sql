-- ============================================================
-- PREDICTIVE INTELLIGENCE LAYER
-- Adds: location_risk_predictions, prediction_accuracy_log
-- All tables in public schema (consistent with existing pattern)
-- ============================================================

-- ── Helper: update_updated_at_column trigger function ──────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── TABLE 1: location_risk_predictions ─────────────────────
-- Written by: generate-alerts edge function (service_role)
-- Read by: operator dashboard, SP-07, admin prediction monitor
-- One row per location per prediction run

CREATE TABLE IF NOT EXISTS location_risk_predictions (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id              UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Core prediction outputs
  failure_probability      DECIMAL(5,4) NOT NULL DEFAULT 0.0000,  -- 0.0000–1.0000
  risk_level               TEXT NOT NULL DEFAULT 'unknown'
                             CHECK (risk_level IN ('critical','high','moderate','low','unknown')),
  score_trajectory         TEXT NOT NULL DEFAULT 'stable'
                             CHECK (score_trajectory IN ('improving','stable','declining','unknown')),
  trajectory_confidence    DECIMAL(5,4) DEFAULT NULL,             -- model confidence 0–1

  -- Service timing output
  recommended_service_date DATE DEFAULT NULL,
  service_urgency          TEXT DEFAULT NULL
                             CHECK (service_urgency IN ('immediate','soon','scheduled','none')),

  -- Top predicted violation categories (array of CIC pillar codes)
  top_risk_pillars         TEXT[] DEFAULT '{}',                   -- e.g. ['P2','P4']
  top_risk_reasons         TEXT[] DEFAULT '{}',                   -- human-readable reason per pillar

  -- Feature inputs used (for explainability)
  input_checklist_rate_30d DECIMAL(5,4) DEFAULT NULL,             -- % checklists completed last 30d
  input_temp_pass_rate_30d DECIMAL(5,4) DEFAULT NULL,             -- % temp logs passing last 30d
  input_days_since_service INTEGER DEFAULT NULL,                  -- days since last hood clean
  input_open_corrective_actions INTEGER DEFAULT 0,                -- count of unresolved CAs
  input_days_to_next_inspection INTEGER DEFAULT NULL,             -- estimated from jurisdiction cycle

  -- Model metadata
  model_version            TEXT NOT NULL DEFAULT 'rules-v1',      -- 'rules-v1' until MindsDB ships
  prediction_method        TEXT NOT NULL DEFAULT 'rules'
                             CHECK (prediction_method IN ('rules','mindsdb','ml-python')),
  predicted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at               TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lrp_org_id
  ON location_risk_predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_lrp_location_id
  ON location_risk_predictions(location_id);
CREATE INDEX IF NOT EXISTS idx_lrp_predicted_at
  ON location_risk_predictions(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_lrp_risk_level
  ON location_risk_predictions(risk_level);

-- Most recent prediction per location (used by dashboard upsert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lrp_latest_per_location
  ON location_risk_predictions(location_id, model_version)
  WHERE expires_at > NOW();

-- Auto-update updated_at
CREATE TRIGGER trg_lrp_updated_at
  BEFORE UPDATE ON location_risk_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: org-scoped, read-only for tenants
ALTER TABLE location_risk_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lrp_org_read" ON location_risk_predictions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "lrp_service_write" ON location_risk_predictions
  FOR ALL USING (auth.role() = 'service_role');


-- ── TABLE 2: prediction_accuracy_log ────────────────────────
-- Written by: edge function after actual inspection results received
-- Read by: admin only (prediction model performance monitoring)

CREATE TABLE IF NOT EXISTS prediction_accuracy_log (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id           UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What we predicted
  prediction_id         UUID REFERENCES location_risk_predictions(id) ON DELETE SET NULL,
  predicted_risk_level  TEXT,
  predicted_probability DECIMAL(5,4),
  predicted_at          TIMESTAMPTZ,

  -- What actually happened
  actual_inspection_date DATE,
  actual_outcome        TEXT CHECK (actual_outcome IN ('pass','fail','conditional','reinspect')),
  actual_score          TEXT,                          -- raw jurisdiction score (never converted)
  actual_violations     INTEGER DEFAULT 0,

  -- Accuracy metrics
  prediction_correct    BOOLEAN DEFAULT NULL,          -- NULL until outcome known
  probability_error     DECIMAL(5,4) DEFAULT NULL,     -- |predicted - actual|
  notes                 TEXT,

  model_version         TEXT NOT NULL DEFAULT 'rules-v1',
  logged_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: admin / service_role only
ALTER TABLE prediction_accuracy_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pal_admin_only" ON prediction_accuracy_log
  FOR ALL USING (auth.role() = 'service_role');
