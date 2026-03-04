-- ============================================================
-- Insurance Scoring Profiles — Configurable weight schemes
-- ============================================================
-- Supports different carrier/org weighting of risk categories.
-- Built-in profiles are system-level; orgs can create custom profiles.
-- ============================================================

-- ── Scoring Profiles Table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS insurance_scoring_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  category_weights jsonb NOT NULL DEFAULT '[]'::jsonb,
  trend_adjustment jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default    boolean NOT NULL DEFAULT false,
  is_system     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_isp_org ON insurance_scoring_profiles(org_id);
CREATE INDEX idx_isp_default ON insurance_scoring_profiles(org_id, is_default) WHERE is_default = true;

-- ── Add profile reference + trend modifier to risk scores ───

ALTER TABLE insurance_risk_scores
  ADD COLUMN IF NOT EXISTS scoring_profile_id uuid REFERENCES insurance_scoring_profiles(id),
  ADD COLUMN IF NOT EXISTS trend_modifier numeric(5,2) DEFAULT 0;

-- ── RLS Policies ────────────────────────────────────────────

ALTER TABLE insurance_scoring_profiles ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's profiles + all system profiles
CREATE POLICY "isp_read" ON insurance_scoring_profiles
  FOR SELECT USING (
    is_system = true
    OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Org admins can insert/update/delete their org's custom profiles
CREATE POLICY "isp_write" ON insurance_scoring_profiles
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner_operator', 'executive', 'platform_admin')
    )
  );

-- ── Seed built-in system profiles ───────────────────────────

INSERT INTO insurance_scoring_profiles (id, org_id, name, description, category_weights, trend_adjustment, is_default, is_system) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'EvidLY Standard',
    'Balanced weighting aligned with commercial kitchen underwriting priorities',
    '[{"key":"fire","name":"Fire Risk","weight":0.40},{"key":"foodSafety","name":"Food Safety","weight":0.30},{"key":"documentation","name":"Documentation","weight":0.20},{"key":"operational","name":"Operational","weight":0.10}]'::jsonb,
    '{"enabled":true,"maxBonus":3,"maxPenalty":5,"volatilityPenalty":0.5}'::jsonb,
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    NULL,
    'Property-Focused',
    'Higher fire/property weighting for property insurance carriers',
    '[{"key":"fire","name":"Fire Risk","weight":0.55},{"key":"foodSafety","name":"Food Safety","weight":0.20},{"key":"documentation","name":"Documentation","weight":0.15},{"key":"operational","name":"Operational","weight":0.10}]'::jsonb,
    '{"enabled":true,"maxBonus":3,"maxPenalty":5,"volatilityPenalty":0.5}'::jsonb,
    false,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'Food Safety-Focused',
    'Higher food safety weighting for general liability carriers',
    '[{"key":"fire","name":"Fire Risk","weight":0.25},{"key":"foodSafety","name":"Food Safety","weight":0.45},{"key":"documentation","name":"Documentation","weight":0.20},{"key":"operational","name":"Operational","weight":0.10}]'::jsonb,
    '{"enabled":true,"maxBonus":3,"maxPenalty":5,"volatilityPenalty":0.5}'::jsonb,
    false,
    true
  )
ON CONFLICT (id) DO NOTHING;
