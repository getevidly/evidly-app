-- ════════════════════════════════════════════════════════════
-- INTELLIGENCE SIGNALS SCHEMA ALIGNMENT
-- The intelligence_signals table was created by admin_console_complete
-- with a simple schema. The intelligence_system migration tried to
-- recreate it with more columns but was a no-op (CREATE TABLE IF NOT EXISTS).
-- This migration adds all missing columns so:
--   1. The admin UI (EvidLYIntelligence.tsx) can query expected columns
--   2. The intelligence-collect edge function can write to this table
--   3. The client intelligence feed pipeline works end-to-end
-- ════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PART A: Fix intelligence_sources table
-- The admin_console_complete migration created this with TEXT id
-- and restrictive CHECK constraints. The intelligence_system
-- migration's INSERT fails because source_key column doesn't exist.
-- ═══════════════════════════════════════════════════════════════

-- Drop restrictive CHECK constraints so intelligence_system INSERT works
DO $$ BEGIN
  ALTER TABLE intelligence_sources DROP CONSTRAINT IF EXISTS intelligence_sources_category_check;
  ALTER TABLE intelligence_sources DROP CONSTRAINT IF EXISTS intelligence_sources_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Add missing columns from intelligence_system migration
DO $$ BEGIN
  ALTER TABLE intelligence_sources
    ADD COLUMN source_key TEXT UNIQUE,
    ADD COLUMN subcategory TEXT,
    ADD COLUMN crawl_method TEXT,
    ADD COLUMN last_signal_at TIMESTAMPTZ,
    ADD COLUMN signal_count_total INT DEFAULT 0,
    ADD COLUMN signal_count_30d INT DEFAULT 0,
    ADD COLUMN is_demo_critical BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- PART B: Fix intelligence_signals table
-- ═══════════════════════════════════════════════════════════════

-- ── Drop the restrictive signal_type CHECK constraint from admin_console_complete ──
-- The edge function writes many more signal_type values than the original constraint allowed.
DO $$ BEGIN
  ALTER TABLE intelligence_signals DROP CONSTRAINT IF EXISTS intelligence_signals_signal_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ── Add columns expected by admin UI (from intelligence_system migration) ──
DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN source_key TEXT,
    ADD COLUMN summary TEXT,
    ADD COLUMN full_content TEXT,
    ADD COLUMN source_url TEXT,
    ADD COLUMN published_date DATE,
    ADD COLUMN discovered_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN scope TEXT CHECK (scope IN (
      'federal','statewide','multi_county','county','city','local'
    )),
    ADD COLUMN affected_jurisdictions TEXT[] DEFAULT '{}',
    ADD COLUMN affected_industries TEXT[] DEFAULT '{}',
    ADD COLUMN affected_modules TEXT[] DEFAULT '{}',
    ADD COLUMN ai_summary TEXT,
    ADD COLUMN ai_impact_score INT CHECK (ai_impact_score BETWEEN 0 AND 100),
    ADD COLUMN ai_urgency TEXT CHECK (ai_urgency IN ('critical','high','medium','low','informational')),
    ADD COLUMN ai_client_impact TEXT,
    ADD COLUMN ai_platform_impact TEXT,
    ADD COLUMN ai_confidence INT CHECK (ai_confidence BETWEEN 0 AND 100),
    ADD COLUMN ai_analyzed_at TIMESTAMPTZ,
    ADD COLUMN status TEXT DEFAULT 'new',
    ADD COLUMN reviewed_by TEXT,
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN dismissed_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── Add risk dimension columns (expected by publish workflow) ──
DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN risk_revenue TEXT DEFAULT 'none',
    ADD COLUMN risk_liability TEXT DEFAULT 'none',
    ADD COLUMN risk_cost TEXT DEFAULT 'none',
    ADD COLUMN risk_operational TEXT DEFAULT 'none';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── Indexes for common queries ──
CREATE INDEX IF NOT EXISTS signals_status_idx     ON intelligence_signals (status);
CREATE INDEX IF NOT EXISTS signals_urgency_idx    ON intelligence_signals (ai_urgency);
CREATE INDEX IF NOT EXISTS signals_source_key_idx ON intelligence_signals (source_key);
CREATE INDEX IF NOT EXISTS signals_discovered_idx ON intelligence_signals (discovered_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS signals_source_url_idx ON intelligence_signals (source_url) WHERE source_url IS NOT NULL;

-- ── Backfill: copy any existing intelligence_insights rows to intelligence_signals ──
INSERT INTO intelligence_signals (
  source_key, signal_type, title, summary, full_content, source_url,
  discovered_at, scope, ai_summary, ai_urgency, ai_confidence,
  status, source_name, category, counties_affected, created_at
)
SELECT
  i.source_id,
  COALESCE(i.source_type, 'regulatory_change'),
  i.title,
  i.summary,
  i.full_analysis,
  i.source_url,
  i.created_at,
  NULL, -- scope not in intelligence_insights
  i.executive_brief,
  CASE i.urgency
    WHEN 'immediate' THEN 'critical'
    WHEN 'urgent' THEN 'high'
    WHEN 'standard' THEN 'medium'
    WHEN 'informational' THEN 'low'
    ELSE 'medium'
  END,
  (i.confidence_score * 100)::INT,
  CASE i.status
    WHEN 'pending_review' THEN 'new'
    WHEN 'approved' THEN 'reviewed'
    WHEN 'published' THEN 'published'
    WHEN 'rejected' THEN 'dismissed'
    ELSE 'new'
  END,
  i.source_name,
  i.category,
  i.affected_counties,
  i.created_at
FROM intelligence_insights i
WHERE i.source_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM intelligence_signals s WHERE s.source_url = i.source_url
  );

-- ── Schedule: pg_cron for daily intelligence crawl (6am PT = 14:00 UTC) ──
-- Uncomment when pg_cron extension is enabled:
-- SELECT cron.schedule(
--   'intelligence-collect-daily',
--   '0 14 * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-collect',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'x-cron-secret', current_setting('app.settings.cron_secret')
--     ),
--     body := '{}'::jsonb
--   )$$
-- );
--
-- SELECT cron.schedule(
--   'crawl-monitor-hourly',
--   '15 * * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/crawl-monitor',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   )$$
-- );
--
-- SELECT cron.schedule(
--   'canonical-correlate-daily',
--   '30 14 * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/canonical-correlate',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   )$$
-- );
