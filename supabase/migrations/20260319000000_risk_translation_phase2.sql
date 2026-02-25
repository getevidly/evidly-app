-- ============================================================
-- Phase 2: Risk Translation Layer
-- ============================================================
-- Fixes V5 (insurance recalculates from raw data), V6 (benchmark
-- recalculates overall_score), V11 (no risk_assessments table),
-- V12 (no FK chain from derived tables).
--
-- All changes are ADDITIVE — no drops, no renames, no data loss.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 2a) RISK_ASSESSMENTS — intelligence→risk correlation store
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  location_id UUID NOT NULL,
  score_snapshot_id UUID REFERENCES compliance_score_snapshots(id),

  -- Risk dimensions (all 0-100, higher = more risk)
  revenue_risk REAL NOT NULL DEFAULT 0,
  cost_risk REAL NOT NULL DEFAULT 0,
  liability_risk REAL NOT NULL DEFAULT 0,
  operational_risk REAL NOT NULL DEFAULT 0,

  -- Insurance translation
  insurance_overall REAL,
  insurance_tier TEXT CHECK (insurance_tier IN ('preferred','standard','elevated','high')),

  -- Explainable drivers
  drivers_json JSONB NOT NULL DEFAULT '[]',

  -- Intelligence correlation
  intelligence_refs UUID[] DEFAULT '{}',

  -- Reproducibility
  model_version TEXT NOT NULL DEFAULT '1.0',
  inputs_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_location
  ON risk_assessments(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_snapshot
  ON risk_assessments(score_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_org
  ON risk_assessments(organization_id);

-- RLS
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ra_org_read" ON risk_assessments
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "ra_service_write" ON risk_assessments
  FOR ALL TO service_role
  USING (true);
