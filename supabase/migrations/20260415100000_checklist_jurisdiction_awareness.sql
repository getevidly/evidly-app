-- ══════════════════════════════════════════════════════════════════
-- CHECKLIST-HACCP-JIE-01: Jurisdiction Awareness for Checklists & HACCP
-- Adds jurisdiction_id columns and violation_patterns table.
-- ══════════════════════════════════════════════════════════════════

-- 1. Add jurisdiction columns to checklist_templates
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS jurisdiction_id UUID,
  ADD COLUMN IF NOT EXISTS food_code_version TEXT;

-- 2. Add jurisdiction column to haccp_plans
ALTER TABLE haccp_plans
  ADD COLUMN IF NOT EXISTS jurisdiction_id UUID;

-- 3. New table: jurisdiction_violation_patterns
--    Stores common violation patterns per jurisdiction for AI weighting
--    and enforcement-priority display in checklists.
CREATE TABLE IF NOT EXISTS jurisdiction_violation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_key TEXT NOT NULL,
  code_section TEXT NOT NULL,
  violation_description TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'occasional',
  pillar TEXT NOT NULL DEFAULT 'food_safety',
  enforcement_priority INTEGER NOT NULL DEFAULT 2,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS
ALTER TABLE jurisdiction_violation_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read violation patterns"
  ON jurisdiction_violation_patterns FOR SELECT USING (true);

CREATE POLICY "Service role manages violation patterns"
  ON jurisdiction_violation_patterns FOR ALL USING (auth.role() = 'service_role');

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_jvp_jurisdiction
  ON jurisdiction_violation_patterns(jurisdiction_key);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_jurisdiction
  ON checklist_templates(jurisdiction_id);

CREATE INDEX IF NOT EXISTS idx_haccp_plans_jurisdiction
  ON haccp_plans(jurisdiction_id);
