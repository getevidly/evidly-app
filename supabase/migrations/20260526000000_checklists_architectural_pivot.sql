-- =====================================================================
-- Checklists Architectural Pivot (v2)
-- =====================================================================
-- Connects to existing master_checklist_definitions (45 rows) and
-- master_checklist_definition_items (262 rows) in PROD.
-- Does NOT create or seed master tables.
-- Does NOT delete any master library data.
--
-- What this migration does:
--   1. Validates master tables exist (guard)
--   2. ALTERs master_checklist_definition_items to add HACCP columns
--   3. Conditionally creates customer adoption layer tables
--   4. Drops 4 legacy 0-row tables
--   5. Deletes Test Kitchen data from user-template tables
--   6. Creates new completion + response tables (adoption layer)
--   7. Adds source columns to haccp_monitoring_logs
--   8. Creates HACCP cross-posting trigger on new responses table
--   9. Creates updated_at and auto-scoring triggers
--  10. Creates checklist_pattern_analysis cache table
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1: Validate master tables exist in PROD
-- ─────────────────────────────────────────────────────────────────────

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'master_checklist_definitions'
  ) THEN
    RAISE EXCEPTION
      'master_checklist_definitions does not exist. '
      'This migration requires the master library tables from Migration 06.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'master_checklist_definition_items'
  ) THEN
    RAISE EXCEPTION
      'master_checklist_definition_items does not exist. '
      'This migration requires the master library tables from Migration 06.';
  END IF;
END $guard$;

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2: Extend master_checklist_definition_items with HACCP cols
-- All ADD COLUMN IF NOT EXISTS — safe to re-run, no data mutation.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE master_checklist_definition_items
  ADD COLUMN IF NOT EXISTS haccp_ccp text,
  ADD COLUMN IF NOT EXISTS haccp_hazard text,
  ADD COLUMN IF NOT EXISTS haccp_critical_limit text,
  ADD COLUMN IF NOT EXISTS temp_min numeric,
  ADD COLUMN IF NOT EXISTS temp_max numeric,
  ADD COLUMN IF NOT EXISTS temp_unit text DEFAULT 'F',
  ADD COLUMN IF NOT EXISTS is_critical boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_photo_on_fail boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_corrective_action boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_master_def_items_ccp
  ON master_checklist_definition_items(haccp_ccp)
  WHERE haccp_ccp IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3: Conditionally create customer adoption layer tables
-- Uses DO blocks so existing tables are preserved untouched.
-- ─────────────────────────────────────────────────────────────────────

DO $cci$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'customer_checklist_instances'
  ) THEN
    CREATE TABLE customer_checklist_instances (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
      master_definition_id uuid NOT NULL
        REFERENCES master_checklist_definitions(id),
      name_override text,
      cadence_override text
        CHECK (cadence_override IS NULL OR cadence_override IN (
          'once_daily','multiple_daily','per_shift',
          'weekly','monthly','quarterly','on_demand'
        )),
      active_days text NOT NULL DEFAULT 'MTWRFSU'
        CHECK (length(active_days) > 0
          AND translate(active_days, 'MTWRFSU', '') = ''),
      due_windows jsonb NOT NULL DEFAULT '[]'::jsonb,
      master_version_pinned text NOT NULL DEFAULT '1.0',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(organization_id, master_definition_id)
    );

    CREATE INDEX idx_cci_org
      ON customer_checklist_instances(organization_id);
    CREATE INDEX idx_cci_master_def
      ON customer_checklist_instances(master_definition_id);

    ALTER TABLE customer_checklist_instances
      ENABLE ROW LEVEL SECURITY;
    CREATE POLICY cci_org_isolation
      ON customer_checklist_instances
      USING (organization_id IN (
        SELECT organization_id FROM user_location_access
        WHERE user_id = auth.uid()
      ));
  END IF;
END $cci$;

DO $ccii$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'customer_checklist_instance_items'
  ) THEN
    CREATE TABLE customer_checklist_instance_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      instance_id uuid NOT NULL
        REFERENCES customer_checklist_instances(id) ON DELETE CASCADE,
      master_item_id uuid NOT NULL
        REFERENCES master_checklist_definition_items(id),
      is_active boolean NOT NULL DEFAULT true,
      sort_order_override integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(instance_id, master_item_id)
    );

    CREATE INDEX idx_ccii_instance
      ON customer_checklist_instance_items(instance_id);

    ALTER TABLE customer_checklist_instance_items
      ENABLE ROW LEVEL SECURITY;
    CREATE POLICY ccii_org_isolation
      ON customer_checklist_instance_items
      USING (instance_id IN (
        SELECT id FROM customer_checklist_instances
        WHERE organization_id IN (
          SELECT organization_id FROM user_location_access
          WHERE user_id = auth.uid()
        )
      ));
  END IF;
END $ccii$;

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4: Drop 4 legacy 0-row tables
-- ─────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS checklist_assignments CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklist_completions CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5: Delete Test Kitchen data from user-template tables
-- These are the 2 user-created test templates + any completions.
-- Does NOT touch master_checklist_definitions or its items.
-- ─────────────────────────────────────────────────────────────────────

DELETE FROM checklist_responses;
DELETE FROM checklist_template_completions;
DELETE FROM checklist_template_items;
DELETE FROM checklist_templates;

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 6: New completion + response tables (adoption layer)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE customer_checklist_instance_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL
    REFERENCES customer_checklist_instances(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  location_id uuid NOT NULL,

  -- Accountability
  started_by uuid NOT NULL REFERENCES user_profiles(id),
  completed_by uuid REFERENCES user_profiles(id),
  reviewed_by uuid REFERENCES user_profiles(id),

  -- Status lifecycle
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','abandoned')),

  -- Timing
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  reviewed_at timestamptz,

  -- Master version snapshot (locked at start)
  master_version_snapshot text NOT NULL,

  -- Audit fields
  logged_retroactively boolean NOT NULL DEFAULT false,
  retroactive_reason text,
  retroactive_logged_at timestamptz,

  -- Score (computed on completion via trigger)
  total_items integer NOT NULL DEFAULT 0,
  passed_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  skipped_items integer NOT NULL DEFAULT 0,
  score_percentage integer,

  -- Location data (for inspector defense)
  latitude numeric,
  longitude numeric,

  -- Notes
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cci_completions_instance
  ON customer_checklist_instance_completions(instance_id);
CREATE INDEX idx_cci_completions_org_date
  ON customer_checklist_instance_completions(
    organization_id, completed_at DESC
  );
CREATE INDEX idx_cci_completions_status
  ON customer_checklist_instance_completions(status);
CREATE INDEX idx_cci_completions_retro
  ON customer_checklist_instance_completions(
    instance_id, logged_retroactively
  ) WHERE logged_retroactively = true;

ALTER TABLE customer_checklist_instance_completions
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY ccic_org_isolation
  ON customer_checklist_instance_completions
  USING (organization_id IN (
    SELECT organization_id FROM user_location_access
    WHERE user_id = auth.uid()
  ));

CREATE TABLE customer_checklist_instance_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id uuid NOT NULL
    REFERENCES customer_checklist_instance_completions(id)
    ON DELETE CASCADE,
  master_item_id uuid NOT NULL
    REFERENCES master_checklist_definition_items(id),

  -- Response data
  response_value text NOT NULL,
  response_type text,
  is_pass boolean,

  -- Temperature reading (when applicable)
  temperature_reading numeric,

  -- Corrective action linkage
  corrective_action text,
  corrective_action_at timestamptz,
  corrective_action_by uuid REFERENCES user_profiles(id),
  linked_corrective_action_id uuid
    REFERENCES corrective_actions(id),

  -- Evidence
  photo_url text,
  device_id text,

  -- Accountability
  responded_by uuid NOT NULL REFERENCES user_profiles(id),
  responded_at timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cci_responses_completion
  ON customer_checklist_instance_responses(completion_id);
CREATE INDEX idx_cci_responses_master_item
  ON customer_checklist_instance_responses(master_item_id);
CREATE INDEX idx_cci_responses_temp
  ON customer_checklist_instance_responses(temperature_reading)
  WHERE temperature_reading IS NOT NULL;

ALTER TABLE customer_checklist_instance_responses
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY ccir_org_isolation
  ON customer_checklist_instance_responses
  USING (completion_id IN (
    SELECT id FROM customer_checklist_instance_completions
    WHERE organization_id IN (
      SELECT organization_id FROM user_location_access
      WHERE user_id = auth.uid()
    )
  ));

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 7: Add source columns to haccp_monitoring_logs
-- (New FK columns for the adoption-layer completion/response tables)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE haccp_monitoring_logs
  ADD COLUMN IF NOT EXISTS source_instance_completion_id uuid
    REFERENCES customer_checklist_instance_completions(id),
  ADD COLUMN IF NOT EXISTS source_instance_response_id uuid
    REFERENCES customer_checklist_instance_responses(id);

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 8: HACCP cross-posting trigger
-- Mirrors existing log_haccp_from_checklist_response() but fires on
-- customer_checklist_instance_responses and reads HACCP CCP data from
-- master_checklist_definition_items. Targets haccp_monitoring_logs.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_haccp_from_instance_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  v_master_item RECORD;
  v_completion RECORD;
  v_ccp_id UUID;
BEGIN
  -- Only act when there is a temperature reading
  IF NEW.temperature_reading IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pull master item details (includes haccp_ccp)
  SELECT * INTO v_master_item
    FROM master_checklist_definition_items
    WHERE id = NEW.master_item_id;

  -- Only log if this item maps to an HACCP CCP
  IF v_master_item IS NULL OR v_master_item.haccp_ccp IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pull completion context
  SELECT * INTO v_completion
    FROM customer_checklist_instance_completions
    WHERE id = NEW.completion_id;

  IF v_completion IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the matching CCP record for this facility
  SELECT hccp.id INTO v_ccp_id
    FROM haccp_critical_control_points hccp
    JOIN haccp_plans hp ON hccp.plan_id = hp.id
    WHERE hccp.ccp_number = v_master_item.haccp_ccp
      AND (hp.facility_id = v_completion.location_id
           OR hp.organization_id = v_completion.organization_id)
    LIMIT 1;

  -- Insert into HACCP monitoring log (same target as legacy trigger)
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
      source_instance_completion_id,
      source_instance_response_id
    ) VALUES (
      v_ccp_id,
      v_completion.organization_id,
      v_completion.location_id,
      NEW.temperature_reading,
      'F',
      COALESCE(NEW.response_value, ''),
      COALESCE(NEW.is_pass, true),
      v_completion.started_by,
      COALESCE(NEW.responded_at, now()),
      v_master_item.haccp_critical_limit,
      NEW.corrective_action,
      NEW.completion_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_log_haccp_from_instance_response
  ON customer_checklist_instance_responses;
CREATE TRIGGER trg_log_haccp_from_instance_response
  AFTER INSERT ON customer_checklist_instance_responses
  FOR EACH ROW EXECUTE FUNCTION log_haccp_from_instance_response();

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 9: Auto-scoring triggers
-- ─────────────────────────────────────────────────────────────────────

-- 9a. updated_at trigger
CREATE OR REPLACE FUNCTION fn_cci_completions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_cci_completions_updated_at
  ON customer_checklist_instance_completions;
CREATE TRIGGER trg_cci_completions_updated_at
  BEFORE UPDATE ON customer_checklist_instance_completions
  FOR EACH ROW EXECUTE FUNCTION fn_cci_completions_updated_at();

-- 9b. Auto-compute score when status changes to 'completed'
CREATE OR REPLACE FUNCTION fn_cci_completions_compute_score()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT
      COUNT(*) FILTER (WHERE is_pass = true),
      COUNT(*) FILTER (WHERE is_pass = false),
      COUNT(*)
    INTO NEW.passed_items, NEW.failed_items, NEW.total_items
    FROM customer_checklist_instance_responses
    WHERE completion_id = NEW.id;

    NEW.skipped_items = NEW.total_items
      - NEW.passed_items - NEW.failed_items;
    NEW.score_percentage = CASE
      WHEN NEW.total_items > 0
      THEN ROUND(
        (NEW.passed_items::numeric / NEW.total_items) * 100
      )
      ELSE 0
    END;

    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = now();
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_cci_completions_compute_score
  ON customer_checklist_instance_completions;
CREATE TRIGGER trg_cci_completions_compute_score
  BEFORE UPDATE ON customer_checklist_instance_completions
  FOR EACH ROW EXECUTE FUNCTION fn_cci_completions_compute_score();

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 10: Analysis cache table
-- (mirrors temperature_pattern_analysis shape)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklist_pattern_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  facility_id uuid,
  instance_id uuid
    REFERENCES customer_checklist_instances(id) ON DELETE SET NULL,
  window_days integer NOT NULL,
  completions_count integer NOT NULL,
  tier integer NOT NULL DEFAULT 0,
  patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_disclaimer text NOT NULL,
  ai_summarized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cpa_org_window
  ON checklist_pattern_analysis(
    organization_id, window_days, created_at DESC
  );

COMMIT;
