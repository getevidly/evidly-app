-- ============================================================
-- Jurisdiction Profile Engine — Task #49 (Roadmap #7)
-- ============================================================
-- Per-location jurisdiction configurations with auto-detection
-- results, manual overrides, and county/city-level compliance.
-- ============================================================

-- ── Location Jurisdiction Profiles ────────────────────────────

CREATE TABLE IF NOT EXISTS location_jurisdiction_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,

  -- Address components
  address TEXT,
  city TEXT,
  county TEXT,
  state TEXT NOT NULL,
  zip TEXT,

  -- Auto-detection results
  detected_state TEXT,
  detected_county TEXT,
  detection_method TEXT NOT NULL DEFAULT 'manual' CHECK (detection_method IN ('zip', 'state', 'manual')),
  jurisdiction_chain TEXT[] NOT NULL DEFAULT '{federal-fda}',

  -- Overrides (regulation_id -> enabled/disabled)
  regulation_overrides JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  is_california BOOLEAN NOT NULL DEFAULT false,
  auto_detected_at TIMESTAMPTZ,
  manually_edited_at TIMESTAMPTZ,
  manually_edited_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (location_id)
);

CREATE INDEX IF NOT EXISTS idx_ljp_org ON location_jurisdiction_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_ljp_state ON location_jurisdiction_profiles(state);
CREATE INDEX IF NOT EXISTS idx_ljp_county ON location_jurisdiction_profiles(county);
CREATE INDEX IF NOT EXISTS idx_ljp_chain ON location_jurisdiction_profiles USING GIN(jurisdiction_chain);

-- ── Jurisdiction Change Log ───────────────────────────────────
-- Tracks when jurisdiction settings are changed (auto or manual)

CREATE TABLE IF NOT EXISTS jurisdiction_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  changed_by UUID,
  change_type TEXT NOT NULL CHECK (change_type IN ('auto_detect', 'manual_override', 'regulation_toggle', 'address_update')),
  previous_chain TEXT[],
  new_chain TEXT[],
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jcl_location ON jurisdiction_change_log(location_id, created_at DESC);

-- ── RLS Policies ────────────────────────────────────────────

ALTER TABLE location_jurisdiction_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_change_log ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own organization's jurisdiction profiles
CREATE POLICY "ljp_org_access" ON location_jurisdiction_profiles
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can read their own organization's change log
CREATE POLICY "jcl_org_read" ON jurisdiction_change_log
  FOR SELECT TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.organization_id = l.organization_id
      WHERE up.id = auth.uid()
    )
  );

-- ── Auto-update timestamp trigger ─────────────────────────────

CREATE OR REPLACE FUNCTION update_ljp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ljp_updated_at_trigger
  BEFORE UPDATE ON location_jurisdiction_profiles
  FOR EACH ROW EXECUTE FUNCTION update_ljp_updated_at();
