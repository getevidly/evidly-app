-- ── GAP-08: Insurance API Request Log ───────────────────────────────
-- Immutable audit log for all insurance API requests.
-- Used for monitoring, rate limiting, and partner usage analytics.
-- ────────────────────────────────────────────────────────────────────

DO $$ BEGIN

-- ── Table: insurance_api_request_log ──
IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insurance_api_request_log') THEN
  CREATE TABLE insurance_api_request_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id      UUID REFERENCES insurance_api_keys(id) ON DELETE SET NULL,

    -- Request details
    endpoint        TEXT NOT NULL,
    method          TEXT NOT NULL DEFAULT 'GET',
    status_code     INT NOT NULL,
    error_code      TEXT,

    -- Client info
    ip_address      INET,
    user_agent      TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Indexes for log queries
  CREATE INDEX idx_api_request_log_key ON insurance_api_request_log(api_key_id, created_at DESC);
  CREATE INDEX idx_api_request_log_created ON insurance_api_request_log(created_at DESC);
  CREATE INDEX idx_api_request_log_status ON insurance_api_request_log(status_code) WHERE status_code >= 400;

  -- RLS — service role only (edge function uses service role key)
  ALTER TABLE insurance_api_request_log ENABLE ROW LEVEL SECURITY;

  -- Allow authenticated users to read logs for their org's keys
  CREATE POLICY api_request_log_read ON insurance_api_request_log
    FOR SELECT USING (api_key_id IN (
      SELECT id FROM insurance_api_keys WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    ));

  -- Insert allowed for service role (edge function)
  CREATE POLICY api_request_log_insert ON insurance_api_request_log
    FOR INSERT WITH CHECK (true);

  RAISE NOTICE 'Created insurance_api_request_log table with indexes and RLS';
END IF;

END $$;
