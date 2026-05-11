-- ═══════════════════════════════════════════
-- RISK-FREE GUARANTEE ELIGIBILITY TRACKING
-- 2-criteria model per ToS commit 1589c76:
--   (a) Locations entered within 15 days
--   (b) Food safety activity on 36 of 60 days
--
-- Activity sources (5 tables):
--   temperature_logs, receiving_temp_logs, cooldown_temp_checks,
--   checklist_completions, checklist_template_completions
-- ═══════════════════════════════════════════

-- 1. ELIGIBILITY TABLE (one row per org)
CREATE TABLE IF NOT EXISTS risk_free_eligibility (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  signup_date timestamptz NOT NULL,
  setup_window_end timestamptz NOT NULL,
  guarantee_window_end timestamptz NOT NULL,

  -- Criterion (a): Locations
  declared_location_count int NOT NULL DEFAULT 1,
  actual_location_count int NOT NULL DEFAULT 0,
  criterion_a_status text NOT NULL DEFAULT 'pending'
    CHECK (criterion_a_status IN ('pending', 'met', 'forfeited')),
  criterion_a_met_at timestamptz,

  -- Criterion (b): Food safety activity
  activity_days int NOT NULL DEFAULT 0,
  required_activity_days int NOT NULL DEFAULT 36,
  criterion_b_status text NOT NULL DEFAULT 'pending'
    CHECK (criterion_b_status IN ('pending', 'met', 'forfeited')),
  criterion_b_met_at timestamptz,

  -- Overall
  overall_status text NOT NULL DEFAULT 'pending'
    CHECK (overall_status IN ('eligible', 'pending', 'forfeited')),
  forfeiture_reason text,

  -- Admin override (org-level)
  admin_override text NOT NULL DEFAULT 'none'
    CHECK (admin_override IN ('none', 'force_eligible', 'force_forfeited')),
  admin_override_reason text,
  admin_override_by uuid REFERENCES auth.users(id),
  admin_override_at timestamptz,

  -- Metadata
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rfe_overall_status ON risk_free_eligibility(overall_status);
CREATE INDEX idx_rfe_pending_window ON risk_free_eligibility(guarantee_window_end)
  WHERE overall_status = 'pending';

-- 2. CONFIG TABLE (single-row, admin-editable thresholds)
CREATE TABLE IF NOT EXISTS risk_free_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  setup_window_days int NOT NULL DEFAULT 15,
  total_window_days int NOT NULL DEFAULT 60,
  activity_days_required int NOT NULL DEFAULT 36,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO risk_free_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 3. RLS POLICIES

ALTER TABLE risk_free_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_free_config ENABLE ROW LEVEL SECURITY;

-- risk_free_eligibility: org members can read their own row
CREATE POLICY "rfe_select_own_org" ON risk_free_eligibility
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- risk_free_eligibility: platform_admin can read all rows
CREATE POLICY "rfe_select_admin" ON risk_free_eligibility
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- risk_free_eligibility: platform_admin can update all rows (for admin overrides)
CREATE POLICY "rfe_update_admin" ON risk_free_eligibility
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- risk_free_config: any authenticated user can read thresholds
CREATE POLICY "rfc_select_authenticated" ON risk_free_config
  FOR SELECT TO authenticated
  USING (true);

-- risk_free_config: platform_admin can update thresholds
CREATE POLICY "rfc_update_admin" ON risk_free_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- 4. RECALC FUNCTION

CREATE OR REPLACE FUNCTION public.recalc_risk_free_eligibility(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rfe$
DECLARE
  _config              RECORD;
  _org                 RECORD;
  _actual_locations    int;
  _activity_days       int;
  _setup_window_end    timestamptz;
  _guarantee_window_end timestamptz;
  _criterion_a         text;
  _criterion_a_met     timestamptz;
  _criterion_b         text;
  _criterion_b_met     timestamptz;
  _overall             text;
  _forfeiture_reason   text;
  _admin_override      text;
BEGIN
  -- Get config
  SELECT * INTO _config FROM risk_free_config WHERE id = 1;

  -- Get org
  SELECT id, created_at, planned_location_count
    INTO _org
    FROM organizations
   WHERE id = p_org_id;
  IF NOT FOUND THEN RETURN; END IF;

  _setup_window_end    := _org.created_at + (_config.setup_window_days || ' days')::interval;
  _guarantee_window_end := _org.created_at + (_config.total_window_days || ' days')::interval;

  -- Check existing admin override
  SELECT admin_override INTO _admin_override
    FROM risk_free_eligibility
   WHERE organization_id = p_org_id;

  -- If admin override exists, set overall from override and bypass calculation
  IF _admin_override = 'force_eligible' THEN
    _overall := 'eligible';
    -- Still update counts for display, but don't change status
    SELECT COUNT(*) INTO _actual_locations
      FROM locations WHERE organization_id = p_org_id;

    SELECT COUNT(DISTINCT activity_date) INTO _activity_days FROM (
      -- temperature_logs (equipment readings)
      SELECT DATE(tl.reading_time) AS activity_date FROM temperature_logs tl
        JOIN locations l ON tl.facility_id = l.id
       WHERE l.organization_id = p_org_id
         AND tl.reading_time BETWEEN _org.created_at AND _guarantee_window_end
      UNION
      -- receiving_temp_logs (delivery receiving)
      SELECT DATE(rtl.created_at) FROM receiving_temp_logs rtl
       WHERE rtl.organization_id = p_org_id
         AND rtl.created_at BETWEEN _org.created_at AND _guarantee_window_end
      UNION
      -- cooldown_temp_checks (FDA cooling)
      SELECT DATE(ctc.check_time) FROM cooldown_temp_checks ctc
        JOIN cooldown_logs cl ON ctc.cooldown_log_id = cl.id
       WHERE cl.organization_id = p_org_id
         AND ctc.check_time BETWEEN _org.created_at AND _guarantee_window_end
      UNION
      -- checklist_completions
      SELECT DATE(cc.completed_at) FROM checklist_completions cc
        JOIN checklists c ON cc.checklist_id = c.id
       WHERE c.organization_id = p_org_id
         AND cc.completed_at BETWEEN _org.created_at AND _guarantee_window_end
      UNION
      -- checklist_template_completions
      SELECT DATE(completed_at) FROM checklist_template_completions
       WHERE organization_id = p_org_id
         AND completed_at BETWEEN _org.created_at AND _guarantee_window_end
    ) AS activity;

    UPDATE risk_free_eligibility SET
      setup_window_end       = _setup_window_end,
      guarantee_window_end   = _guarantee_window_end,
      declared_location_count = _org.planned_location_count,
      actual_location_count  = COALESCE(_actual_locations, 0),
      activity_days          = COALESCE(_activity_days, 0),
      required_activity_days = _config.activity_days_required,
      overall_status         = 'eligible',
      last_calculated_at     = now()
    WHERE organization_id = p_org_id;
    RETURN;

  ELSIF _admin_override = 'force_forfeited' THEN
    UPDATE risk_free_eligibility SET
      overall_status     = 'forfeited',
      forfeiture_reason  = 'admin_override',
      last_calculated_at = now()
    WHERE organization_id = p_org_id;
    RETURN;
  END IF;

  -- Criterion (a): Locations
  SELECT COUNT(*) INTO _actual_locations
    FROM locations WHERE organization_id = p_org_id;

  IF _actual_locations >= _org.planned_location_count THEN
    _criterion_a := 'met';
    SELECT created_at INTO _criterion_a_met
      FROM locations
     WHERE organization_id = p_org_id
     ORDER BY created_at
     OFFSET (_org.planned_location_count - 1) LIMIT 1;
  ELSIF now() > _setup_window_end THEN
    _criterion_a := 'forfeited';
  ELSE
    _criterion_a := 'pending';
  END IF;

  -- Criterion (b): Food safety activity days within 60-day window
  -- Sources: temperature_logs, receiving_temp_logs, cooldown_temp_checks,
  --          checklist_completions, checklist_template_completions
  SELECT COUNT(DISTINCT activity_date) INTO _activity_days FROM (
    -- temperature_logs (equipment readings)
    SELECT DATE(tl.reading_time) AS activity_date FROM temperature_logs tl
      JOIN locations l ON tl.facility_id = l.id
     WHERE l.organization_id = p_org_id
       AND tl.reading_time BETWEEN _org.created_at AND _guarantee_window_end
    UNION
    -- receiving_temp_logs (delivery receiving)
    SELECT DATE(rtl.created_at) FROM receiving_temp_logs rtl
     WHERE rtl.organization_id = p_org_id
       AND rtl.created_at BETWEEN _org.created_at AND _guarantee_window_end
    UNION
    -- cooldown_temp_checks (FDA cooling)
    SELECT DATE(ctc.check_time) FROM cooldown_temp_checks ctc
      JOIN cooldown_logs cl ON ctc.cooldown_log_id = cl.id
     WHERE cl.organization_id = p_org_id
       AND ctc.check_time BETWEEN _org.created_at AND _guarantee_window_end
    UNION
    -- checklist_completions
    SELECT DATE(cc.completed_at) FROM checklist_completions cc
      JOIN checklists c ON cc.checklist_id = c.id
     WHERE c.organization_id = p_org_id
       AND cc.completed_at BETWEEN _org.created_at AND _guarantee_window_end
    UNION
    -- checklist_template_completions
    SELECT DATE(completed_at) FROM checklist_template_completions
     WHERE organization_id = p_org_id
       AND completed_at BETWEEN _org.created_at AND _guarantee_window_end
  ) AS activity;

  IF _activity_days >= _config.activity_days_required THEN
    _criterion_b := 'met';
    _criterion_b_met := now();
  ELSIF now() > _guarantee_window_end THEN
    _criterion_b := 'forfeited';
  ELSE
    _criterion_b := 'pending';
  END IF;

  -- Overall status
  IF _criterion_a = 'forfeited' THEN
    _overall := 'forfeited';
    _forfeiture_reason := 'locations_not_entered_in_setup_window';
  ELSIF _criterion_a = 'met' AND _criterion_b = 'met' THEN
    _overall := 'eligible';
  ELSIF _criterion_a = 'met' AND _criterion_b = 'forfeited' THEN
    _overall := 'forfeited';
    _forfeiture_reason := 'insufficient_activity_in_guarantee_window';
  ELSE
    _overall := 'pending';
  END IF;

  -- Upsert
  INSERT INTO risk_free_eligibility (
    organization_id, signup_date, setup_window_end, guarantee_window_end,
    declared_location_count, actual_location_count,
    criterion_a_status, criterion_a_met_at,
    activity_days, required_activity_days,
    criterion_b_status, criterion_b_met_at,
    overall_status, forfeiture_reason, last_calculated_at
  ) VALUES (
    p_org_id, _org.created_at, _setup_window_end, _guarantee_window_end,
    _org.planned_location_count, COALESCE(_actual_locations, 0),
    COALESCE(_criterion_a, 'pending'), _criterion_a_met,
    COALESCE(_activity_days, 0), _config.activity_days_required,
    COALESCE(_criterion_b, 'pending'), _criterion_b_met,
    _overall, _forfeiture_reason, now()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    setup_window_end       = EXCLUDED.setup_window_end,
    guarantee_window_end   = EXCLUDED.guarantee_window_end,
    declared_location_count = EXCLUDED.declared_location_count,
    actual_location_count  = EXCLUDED.actual_location_count,
    criterion_a_status     = EXCLUDED.criterion_a_status,
    criterion_a_met_at     = COALESCE(risk_free_eligibility.criterion_a_met_at, EXCLUDED.criterion_a_met_at),
    activity_days          = EXCLUDED.activity_days,
    required_activity_days = EXCLUDED.required_activity_days,
    criterion_b_status     = EXCLUDED.criterion_b_status,
    criterion_b_met_at     = COALESCE(risk_free_eligibility.criterion_b_met_at, EXCLUDED.criterion_b_met_at),
    overall_status         = EXCLUDED.overall_status,
    forfeiture_reason      = EXCLUDED.forfeiture_reason,
    last_calculated_at     = EXCLUDED.last_calculated_at
  WHERE risk_free_eligibility.admin_override = 'none';
END;
$rfe$;

-- 5. TRIGGERS (6 total: 1 for locations criterion, 5 for activity sources)

-- locations (direct org_id) — criterion (a)
CREATE OR REPLACE FUNCTION public.trg_rfe_on_locations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rfe$
BEGIN
  PERFORM recalc_risk_free_eligibility(NEW.organization_id);
  RETURN NEW;
END;
$rfe$;

CREATE TRIGGER trg_rfe_locations
  AFTER INSERT ON locations
  FOR EACH ROW EXECUTE FUNCTION trg_rfe_on_locations();

-- temperature_logs (org via locations.id)
CREATE OR REPLACE FUNCTION public.trg_rfe_on_temperature_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rfe$
DECLARE
  _org_id uuid;
BEGIN
  SELECT organization_id INTO _org_id
    FROM locations WHERE id = NEW.facility_id;
  IF _org_id IS NOT NULL THEN
    PERFORM recalc_risk_free_eligibility(_org_id);
  END IF;
  RETURN NEW;
END;
$rfe$;

CREATE TRIGGER trg_rfe_temperature_logs
  AFTER INSERT ON temperature_logs
  FOR EACH ROW EXECUTE FUNCTION trg_rfe_on_temperature_logs();

-- receiving_temp_logs (direct org_id)
CREATE OR REPLACE FUNCTION public.trg_rfe_on_receiving_temp_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rfe$
BEGIN
  PERFORM recalc_risk_free_eligibility(NEW.organization_id);
  RETURN NEW;
END;
$rfe$;

CREATE TRIGGER trg_rfe_receiving_temp_logs
  AFTER INSERT ON receiving_temp_logs
  FOR EACH ROW EXECUTE FUNCTION trg_rfe_on_receiving_temp_logs();

-- cooldown_temp_checks (org via cooldown_logs.id)
CREATE OR REPLACE FUNCTION public.trg_rfe_on_cooldown_temp_checks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rfe$
DECLARE
  _org_id uuid;
BEGIN
  SELECT organization_id INTO _org_id
    FROM cooldown_logs WHERE id = NEW.cooldown_log_id;
  IF _org_id IS NOT NULL THEN
    PERFORM recalc_risk_free_eligibility(_org_id);
  END IF;
  RETURN NEW;
END;
$rfe$;

CREATE TRIGGER trg_rfe_cooldown_temp_checks
  AFTER INSERT ON cooldown_temp_checks
  FOR EACH ROW EXECUTE FUNCTION trg_rfe_on_cooldown_temp_checks();

-- checklist_completions (org via checklists.id)
CREATE OR REPLACE FUNCTION public.trg_rfe_on_checklist_completions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rfe$
DECLARE
  _org_id uuid;
BEGIN
  SELECT organization_id INTO _org_id
    FROM checklists WHERE id = NEW.checklist_id;
  IF _org_id IS NOT NULL THEN
    PERFORM recalc_risk_free_eligibility(_org_id);
  END IF;
  RETURN NEW;
END;
$rfe$;

CREATE TRIGGER trg_rfe_checklist_completions
  AFTER INSERT ON checklist_completions
  FOR EACH ROW EXECUTE FUNCTION trg_rfe_on_checklist_completions();

-- checklist_template_completions (direct org_id)
CREATE OR REPLACE FUNCTION public.trg_rfe_on_checklist_template_completions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rfe$
BEGIN
  PERFORM recalc_risk_free_eligibility(NEW.organization_id);
  RETURN NEW;
END;
$rfe$;

CREATE TRIGGER trg_rfe_checklist_template_completions
  AFTER INSERT ON checklist_template_completions
  FOR EACH ROW EXECUTE FUNCTION trg_rfe_on_checklist_template_completions();

-- 6. BACKFILL: create rows for all existing orgs, then recalc

INSERT INTO risk_free_eligibility (
  organization_id, signup_date, setup_window_end, guarantee_window_end,
  declared_location_count
)
SELECT
  id,
  created_at,
  created_at + interval '15 days',
  created_at + interval '60 days',
  COALESCE(planned_location_count, 1)
FROM organizations
ON CONFLICT DO NOTHING;

DO $backfill$
DECLARE
  _org_id uuid;
BEGIN
  FOR _org_id IN SELECT id FROM organizations LOOP
    PERFORM recalc_risk_free_eligibility(_org_id);
  END LOOP;
END;
$backfill$;
