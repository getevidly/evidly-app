-- ═══════════════════════════════════════════════════════════════════════
-- Apply missing checklist module columns
--
-- Migration 20260304000001_daily_checklists_module was recorded in
-- schema_migrations but its ALTER TABLE DDL never took effect in PROD
-- (reverted by commit 6a1197d along with 65 other staging commits).
--
-- This migration re-applies the column additions. All statements use
-- ADD COLUMN IF NOT EXISTS for idempotency.
--
-- Tables affected:
--   checklist_template_items   — 17 columns + 1 index
--   checklist_templates        — 3 columns
--   checklist_template_completions — 10 columns + 2 indexes
--   checklist_responses        — 7 columns + 1 index
-- ═══════════════════════════════════════════════════════════════════════

-- ── checklist_template_items — authority, HACCP, temperature ──────────
ALTER TABLE checklist_template_items
  ADD COLUMN IF NOT EXISTS item_text TEXT,
  ADD COLUMN IF NOT EXISTS pillar TEXT DEFAULT 'food_safety',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS authority_source TEXT DEFAULT 'evidly_best_practice',
  ADD COLUMN IF NOT EXISTS authority_section TEXT,
  ADD COLUMN IF NOT EXISTS authority_note TEXT,
  ADD COLUMN IF NOT EXISTS temp_min DECIMAL,
  ADD COLUMN IF NOT EXISTS temp_max DECIMAL,
  ADD COLUMN IF NOT EXISTS temp_unit TEXT DEFAULT 'F',
  ADD COLUMN IF NOT EXISTS haccp_ccp TEXT,
  ADD COLUMN IF NOT EXISTS haccp_hazard TEXT,
  ADD COLUMN IF NOT EXISTS haccp_critical_limit TEXT,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_photo_on_fail BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_corrective_action BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_checklist_items_ccp
  ON checklist_template_items(haccp_ccp) WHERE haccp_ccp IS NOT NULL;

-- ── checklist_templates — pillar, facility_id, sort_order ─────────────
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS pillar TEXT DEFAULT 'food_safety',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ── checklist_template_completions — review, status, counts ───────────
ALTER TABLE checklist_template_completions
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passed_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_items INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL;

CREATE INDEX IF NOT EXISTS idx_checklist_completions_status
  ON checklist_template_completions(status);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_date
  ON checklist_template_completions(completed_at);

-- ── checklist_responses — temperature, device, corrective detail ──────
ALTER TABLE checklist_responses
  ADD COLUMN IF NOT EXISTS response_type TEXT,
  ADD COLUMN IF NOT EXISTS response_passed BOOLEAN,
  ADD COLUMN IF NOT EXISTS temperature_reading DECIMAL,
  ADD COLUMN IF NOT EXISTS corrective_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS corrective_action_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_checklist_responses_temp
  ON checklist_responses(temperature_reading) WHERE temperature_reading IS NOT NULL;
