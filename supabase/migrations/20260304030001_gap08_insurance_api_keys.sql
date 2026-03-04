-- ── GAP-08: Insurance API Keys ──────────────────────────────────────
-- Stores hashed API keys for insurance partner access to compliance data.
-- Keys are scoped by org, facility, and data permissions.
-- ────────────────────────────────────────────────────────────────────

DO $$ BEGIN

-- ── Table: insurance_api_keys ──
IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insurance_api_keys') THEN
  CREATE TABLE insurance_api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Key identification
    label           TEXT NOT NULL,
    key_hash        TEXT NOT NULL UNIQUE,
    key_preview     TEXT NOT NULL,  -- e.g. "ev_...a1b2"

    -- Permissions
    permissions     TEXT[] NOT NULL DEFAULT '{}',  -- compliance_score, inspection_history, risk_summary
    facility_scope  TEXT[] NOT NULL DEFAULT '{"all"}',  -- facility IDs or ["all"]

    -- Lifecycle
    expires_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    last_used_at    TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Indexes
  CREATE INDEX idx_insurance_api_keys_org ON insurance_api_keys(org_id);
  CREATE INDEX idx_insurance_api_keys_hash ON insurance_api_keys(key_hash);
  CREATE INDEX idx_insurance_api_keys_active ON insurance_api_keys(org_id) WHERE revoked_at IS NULL;

  -- RLS
  ALTER TABLE insurance_api_keys ENABLE ROW LEVEL SECURITY;

  CREATE POLICY insurance_api_keys_org_read ON insurance_api_keys
    FOR SELECT USING (org_id IN (
      SELECT org_id FROM user_profiles WHERE id = auth.uid()
    ));

  -- Only platform_admin can write (enforced at app level; RLS allows org members to insert)
  CREATE POLICY insurance_api_keys_org_write ON insurance_api_keys
    FOR ALL USING (org_id IN (
      SELECT org_id FROM user_profiles WHERE id = auth.uid()
    ));

  RAISE NOTICE 'Created insurance_api_keys table with indexes and RLS';
END IF;

-- ── Updated_at trigger ──
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_insurance_api_keys_updated_at') THEN
  CREATE TRIGGER set_insurance_api_keys_updated_at
    BEFORE UPDATE ON insurance_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF;

END $$;
