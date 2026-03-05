-- K12-BUILD-01: K-12 Food Safety Module — location fields + NSLP claim periods
-- Adds K-12-specific columns to locations and creates NSLP claim tracking table.
-- Org-level k12_enrolled already exists (migration 20260505200000).

-- ── A. Location K-12 fields ────────────────────────────────────
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS nslp_enrolled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS usda_commodities boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS usda_review_date date,
ADD COLUMN IF NOT EXISTS meal_count_daily integer,
ADD COLUMN IF NOT EXISTS school_name text,
ADD COLUMN IF NOT EXISTS district_name text;

-- ── B. NSLP claim periods ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS nslp_claim_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  claim_period text NOT NULL,           -- e.g. "2026-02"
  meal_count_total integer,
  meal_count_daily_avg numeric,
  claim_submitted boolean DEFAULT false,
  claim_submitted_at timestamp with time zone,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE nslp_claim_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_nslp" ON nslp_claim_periods
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
