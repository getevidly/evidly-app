-- ═══════════════════════════════════════════════════════════════════════
-- Daily Checklists Module — HACCP columns & trigger
-- (Split from 20260304000000_daily_checklists_module.sql to run after
--  20260328000003_haccp_tables.sql which creates the HACCP tables)
-- ═══════════════════════════════════════════════════════════════════════

-- ── haccp_plans — add facility_id, version, specialized_processes ────
ALTER TABLE haccp_plans
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS specialized_processes JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_haccp_plans_facility
  ON haccp_plans(facility_id) WHERE facility_id IS NOT NULL;

-- ── haccp_critical_control_points — add name, frequency, linked items ─
ALTER TABLE haccp_critical_control_points
  ADD COLUMN IF NOT EXISTS ccp_name TEXT,
  ADD COLUMN IF NOT EXISTS monitoring_frequency TEXT,
  ADD COLUMN IF NOT EXISTS record_keeping TEXT,
  ADD COLUMN IF NOT EXISTS linked_item_ids UUID[] DEFAULT '{}';

-- ── haccp_monitoring_logs — add facility, corrective, source links ───
ALTER TABLE haccp_monitoring_logs
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS critical_limit TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS corrective_action_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS source_checklist_completion_id UUID REFERENCES checklist_template_completions(id),
  ADD COLUMN IF NOT EXISTS source_checklist_response_id UUID REFERENCES checklist_responses(id);

CREATE INDEX IF NOT EXISTS idx_haccp_logs_facility_date
  ON haccp_monitoring_logs(facility_id, monitored_at) WHERE facility_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- HACCP AUTO-POPULATE TRIGGER
-- When a checklist response is inserted for an item with a HACCP CCP,
-- automatically insert a monitoring log entry
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_haccp_from_checklist_response()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_completion RECORD;
  v_ccp_id UUID;
  v_org_id UUID;
  v_facility_id UUID;
BEGIN
  -- Look up the checklist item to see if it has a HACCP CCP
  SELECT * INTO v_item
    FROM checklist_template_items
    WHERE id = NEW.template_item_id;

  IF v_item IS NULL OR v_item.haccp_ccp IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up completion for org/facility context
  SELECT * INTO v_completion
    FROM checklist_template_completions
    WHERE id = NEW.completion_id;

  IF v_completion IS NULL THEN
    RETURN NEW;
  END IF;

  v_org_id := v_completion.organization_id;
  v_facility_id := v_completion.location_id;

  -- Find the matching CCP record for this facility
  SELECT hccp.id INTO v_ccp_id
    FROM haccp_critical_control_points hccp
    JOIN haccp_plans hp ON hccp.plan_id = hp.id
    WHERE hccp.ccp_number = v_item.haccp_ccp
      AND (hp.facility_id = v_facility_id OR hp.organization_id = v_org_id)
    LIMIT 1;

  -- Only insert if we found a matching CCP
  IF v_ccp_id IS NOT NULL THEN
    INSERT INTO haccp_monitoring_logs (
      ccp_id,
      organization_id,
      facility_id,
      reading_value,
      reading_unit,
      reading_text,
      is_within_limit,
      monitored_by,
      monitored_at,
      critical_limit,
      corrective_action,
      source_checklist_completion_id,
      source_checklist_response_id
    ) VALUES (
      v_ccp_id,
      v_org_id,
      v_facility_id,
      NEW.temperature_reading,
      'F',
      COALESCE(NEW.response_value, ''),
      COALESCE(NEW.response_passed, NEW.is_pass, true),
      v_completion.completed_by,
      COALESCE(NEW.responded_at, now()),
      v_item.haccp_critical_limit,
      NEW.corrective_action,
      NEW.completion_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to avoid duplicate trigger
DROP TRIGGER IF EXISTS trg_log_haccp_from_checklist ON checklist_responses;

CREATE TRIGGER trg_log_haccp_from_checklist
  AFTER INSERT ON checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION log_haccp_from_checklist_response();
