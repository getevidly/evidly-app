-- ============================================================
-- Phase 3: Intelligence Normalization
-- ============================================================
-- Fixes V8 (5 intelligence stores → 1), V9 (webhook writes
-- wrong table). All writers now target intelligence_insights
-- with source_type discriminating origin.
--
-- source_type column already exists (TEXT NOT NULL, no CHECK).
-- This migration adds an index + backward-compatible views.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 3a) INDEX on source_type for filtering
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_intel_insights_source_type
  ON intelligence_insights(source_type);

-- ═══════════════════════════════════════════════════════════
-- 3b) BACKWARD-COMPATIBLE VIEWS
-- ═══════════════════════════════════════════════════════════
-- These views allow any code that previously read from the
-- old ai_insights or regulatory_changes tables to read from
-- intelligence_insights transparently via the view.

CREATE OR REPLACE VIEW ai_insights_v AS
  SELECT * FROM intelligence_insights
  WHERE source_type IN (
    'ai_pattern',
    'ai_prediction',
    'ai_digest',
    'ai_corrective',
    'webhook_inbound'
  );

CREATE OR REPLACE VIEW regulatory_changes_v AS
  SELECT * FROM intelligence_insights
  WHERE source_type = 'regulatory_monitor';
