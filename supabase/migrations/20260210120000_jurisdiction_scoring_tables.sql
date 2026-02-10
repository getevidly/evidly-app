-- Jurisdiction scoring tables for dual-layer compliance system
-- Stores county-specific scoring profiles, violation mappings, and calculated scores

-- ═══════════════════════════════════════════════════════════════
-- Table 1: jurisdiction_scoring_profiles
-- Stores per-county scoring configuration (letter grade, pass/fail, etc.)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE jurisdiction_scoring_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_name text NOT NULL,
  state varchar(2) NOT NULL DEFAULT 'CA',
  county text NOT NULL,
  scoring_type varchar(50) NOT NULL CHECK (scoring_type IN ('letter_grade', 'pass_fail', 'color_placard', 'standard')),
  grade_thresholds jsonb NOT NULL DEFAULT '{}',
  violation_weights jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(state, county)
);

ALTER TABLE jurisdiction_scoring_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read jurisdiction profiles"
  ON jurisdiction_scoring_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage jurisdiction profiles"
  ON jurisdiction_scoring_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Table 2: violation_code_mappings
-- Maps EvidLY compliance items to jurisdiction-specific violation codes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE violation_code_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidly_item_id text NOT NULL,
  jurisdiction_id uuid REFERENCES jurisdiction_scoring_profiles(id) ON DELETE CASCADE,
  violation_code text NOT NULL,
  violation_type varchar(20) NOT NULL CHECK (violation_type IN ('critical', 'major', 'minor', 'good_practice')),
  point_deduction numeric(4,1) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE violation_code_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read violation mappings"
  ON violation_code_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage violation mappings"
  ON violation_code_mappings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Table 3: location_jurisdiction_scores
-- Stores calculated scores per location per jurisdiction
-- Auto-recalculated when underlying compliance data changes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE location_jurisdiction_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  jurisdiction_id uuid NOT NULL REFERENCES jurisdiction_scoring_profiles(id),
  evidly_score integer NOT NULL CHECK (evidly_score BETWEEN 0 AND 100),
  jurisdiction_score integer NOT NULL CHECK (jurisdiction_score BETWEEN 0 AND 100),
  jurisdiction_grade text NOT NULL,
  calculated_at timestamptz DEFAULT now(),
  violation_details jsonb NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_loc_jurisdiction_scores_location ON location_jurisdiction_scores(location_id);
CREATE INDEX idx_loc_jurisdiction_scores_calc ON location_jurisdiction_scores(calculated_at);

ALTER TABLE location_jurisdiction_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read scores for their organization locations"
  ON location_jurisdiction_scores FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage jurisdiction scores"
  ON location_jurisdiction_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Trigger: auto-update updated_at on jurisdiction_scoring_profiles
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_jurisdiction_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jurisdiction_profile_updated
  BEFORE UPDATE ON jurisdiction_scoring_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_jurisdiction_profile_timestamp();
