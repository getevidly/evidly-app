-- ════════════════════════════════════════════════════════════
-- INTELLIGENCE AUTO-ROUTING ENGINE
-- Adds routing tier columns, auto-publish scheduling,
-- and routing mode configuration for the intelligence pipeline.
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. Auto-routing columns on intelligence_signals
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN routing_tier TEXT DEFAULT 'hold' CHECK (routing_tier IN ('auto','notify','hold')),
    ADD COLUMN severity_score INT DEFAULT 0 CHECK (severity_score BETWEEN 0 AND 100),
    ADD COLUMN confidence_score INT DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
    ADD COLUMN auto_published BOOLEAN DEFAULT false,
    ADD COLUMN auto_publish_at TIMESTAMPTZ,
    ADD COLUMN review_deadline TIMESTAMPTZ,
    ADD COLUMN routing_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_signals_routing_tier ON intelligence_signals (routing_tier);
CREATE INDEX IF NOT EXISTS idx_signals_auto_publish ON intelligence_signals (auto_publish_at)
  WHERE routing_tier = 'auto' AND status != 'published' AND auto_publish_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Auto-routing columns on jurisdiction_intel_updates
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE jurisdiction_intel_updates
    ADD COLUMN routing_tier TEXT DEFAULT 'hold' CHECK (routing_tier IN ('auto','notify','hold')),
    ADD COLUMN severity_score INT DEFAULT 0 CHECK (severity_score BETWEEN 0 AND 100),
    ADD COLUMN confidence_score INT DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
    ADD COLUMN auto_published BOOLEAN DEFAULT false,
    ADD COLUMN auto_publish_at TIMESTAMPTZ,
    ADD COLUMN review_deadline TIMESTAMPTZ,
    ADD COLUMN routing_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Auto-routing columns on regulatory_changes
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE regulatory_changes
    ADD COLUMN routing_tier TEXT DEFAULT 'hold' CHECK (routing_tier IN ('auto','notify','hold')),
    ADD COLUMN severity_score INT DEFAULT 0 CHECK (severity_score BETWEEN 0 AND 100),
    ADD COLUMN confidence_score INT DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
    ADD COLUMN auto_published BOOLEAN DEFAULT false,
    ADD COLUMN auto_publish_at TIMESTAMPTZ,
    ADD COLUMN review_deadline TIMESTAMPTZ,
    ADD COLUMN routing_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 4. Platform settings for routing mode
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS ps_admin_all ON platform_settings;
  CREATE POLICY ps_admin_all ON platform_settings
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS ps_service ON platform_settings;
  CREATE POLICY ps_service ON platform_settings
    FOR ALL TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Default: supervised mode (admin must approve everything)
INSERT INTO platform_settings (key, value)
VALUES ('intelligence_routing_mode', '"supervised"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 5. Auto-publish execution log
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_auto_publish_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('signal','jurisdiction_update','regulatory_change')),
  entity_id UUID NOT NULL,
  routing_tier TEXT NOT NULL,
  severity_score INT,
  confidence_score INT,
  action TEXT NOT NULL CHECK (action IN ('auto_published','notified','held','approved','rejected')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE intelligence_auto_publish_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS iapl_admin ON intelligence_auto_publish_log;
  CREATE POLICY iapl_admin ON intelligence_auto_publish_log
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS iapl_service ON intelligence_auto_publish_log;
  CREATE POLICY iapl_service ON intelligence_auto_publish_log
    FOR ALL TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_iapl_entity ON intelligence_auto_publish_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_iapl_created ON intelligence_auto_publish_log (created_at DESC);
