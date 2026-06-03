-- ═══════════════════════════════════════════
-- FIX: recalc_risk_free_eligibility() — guard checklist_completions arm
--
-- Problem: Arm 4 of the 5-source activity-days UNION queries
-- checklist_completions JOIN checklists — both tables MISSING in PROD
-- (superseded by checklist_template_completions). This throws 42P01
-- on every location INSERT (trigger trg_rfe_locations fires the function).
--
-- Fix: Build the activity-days query dynamically. Arms 1-3 and 5 are
-- static (tables confirmed in PROD). Arm 4 is conditionally included
-- via to_regclass() — absent tables contribute nothing; when created
-- in future, the arm self-activates with zero code change.
--
-- Trigger trg_rfe_locations is NOT changed.
-- All other logic (criterion a/b, thresholds, upsert) is byte-for-byte
-- identical to 20260815000000_risk_free_eligibility.sql.
-- ═══════════════════════════════════════════

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
  _activity_sql        text;
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

  -- Build activity-days query once (used in both admin-override and normal paths).
  -- Arms 1-3 and 5 target tables confirmed in PROD. Arm 4 (checklist_completions
  -- JOIN checklists) is guarded: those tables may not yet exist (42P01).
  _activity_sql := '
    SELECT COUNT(DISTINCT activity_date) FROM (
      SELECT DATE(tl.reading_time) AS activity_date FROM temperature_logs tl
        JOIN locations l ON tl.facility_id = l.id
       WHERE l.organization_id = $1
         AND tl.reading_time BETWEEN $2 AND $3
      UNION
      SELECT DATE(rtl.created_at) FROM receiving_temp_logs rtl
       WHERE rtl.organization_id = $1
         AND rtl.created_at BETWEEN $2 AND $3
      UNION
      SELECT DATE(ctc.check_time) FROM cooldown_temp_checks ctc
        JOIN cooldown_logs cl ON ctc.cooldown_log_id = cl.id
       WHERE cl.organization_id = $1
         AND ctc.check_time BETWEEN $2 AND $3';

  -- Arm 4: checklist_completions — guarded (tables missing in PROD today)
  IF to_regclass('public.checklist_completions') IS NOT NULL
     AND to_regclass('public.checklists') IS NOT NULL THEN
    _activity_sql := _activity_sql || '
      UNION
      SELECT DATE(cc.completed_at) FROM checklist_completions cc
        JOIN checklists c ON cc.checklist_id = c.id
       WHERE c.organization_id = $1
         AND cc.completed_at BETWEEN $2 AND $3';
  END IF;

  _activity_sql := _activity_sql || '
      UNION
      SELECT DATE(completed_at) FROM checklist_template_completions
       WHERE organization_id = $1
         AND completed_at BETWEEN $2 AND $3
    ) AS activity';

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

    EXECUTE _activity_sql INTO _activity_days
      USING p_org_id, _org.created_at, _guarantee_window_end;

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
  --          checklist_completions (guarded), checklist_template_completions
  EXECUTE _activity_sql INTO _activity_days
    USING p_org_id, _org.created_at, _guarantee_window_end;

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

-- Track migration
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260901000000')
ON CONFLICT DO NOTHING;
