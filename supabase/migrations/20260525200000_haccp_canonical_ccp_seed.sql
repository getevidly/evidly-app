-- =====================================================================
-- HACCP Canonical CCP Seed — 6 operational CCPs from CalCode
-- =====================================================================
-- Deletes the P1-P7 methodology template plan (0 FK references).
-- Drops stale template-read RLS policies.
-- Creates fn_seed_canonical_haccp() to provision 6 operational CCPs.
-- Backfills all existing organizations.
-- =====================================================================

BEGIN;

-- ─── A.1 Drop stale template-read RLS policies ─────────────────────
DROP POLICY IF EXISTS haccp_plans_read_templates ON haccp_plans;
DROP POLICY IF EXISTS haccp_ccps_read_templates ON haccp_critical_control_points;

-- ─── A.5 Widen source CHECK to include 'canonical' ─────────────────
ALTER TABLE haccp_critical_control_points
  DROP CONSTRAINT IF EXISTS haccp_critical_control_points_source_check;
ALTER TABLE haccp_critical_control_points
  ADD CONSTRAINT haccp_critical_control_points_source_check
  CHECK (source IN ('temp_log', 'checklist', 'canonical', 'iot_sensor'));

-- ─── A.3 Delete P1-P7 CCPs ─────────────────────────────────────────
DELETE FROM haccp_critical_control_points
  WHERE plan_id = 'a1c39291-758a-4f83-a727-f42df9372bfa';

-- ─── A.4 Delete the template plan ──────────────────────────────────
DELETE FROM haccp_plans
  WHERE id = 'a1c39291-758a-4f83-a727-f42df9372bfa';

-- ─── B. Canonical CCP seed function ─────────────────────────────────
CREATE OR REPLACE FUNCTION fn_seed_canonical_haccp(target_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Idempotent: skip if this org already has a canonical plan
  SELECT id INTO v_plan_id
    FROM haccp_plans
    WHERE organization_id = target_org_id
      AND status = 'active'
      AND name = 'Operational HACCP — California Retail Food Code'
    LIMIT 1;

  IF v_plan_id IS NOT NULL THEN
    RETURN v_plan_id;
  END IF;

  -- Insert the plan
  INSERT INTO haccp_plans (
    organization_id, name, status, version, description
  ) VALUES (
    target_org_id,
    'Operational HACCP — California Retail Food Code',
    'active',
    1,
    'Canonical 6-CCP plan covering CalCode + FDA Food Code critical control points for retail food operations'
  )
  RETURNING id INTO v_plan_id;

  -- Insert 6 canonical CCPs
  INSERT INTO haccp_critical_control_points (
    plan_id, ccp_number, ccp_name, hazard, critical_limit,
    monitoring_procedure, corrective_action, verification,
    hazard_type, monitoring_frequency, source, principle_number, display_order
  ) VALUES
  (
    v_plan_id, 'CCP-01', 'Receiving',
    'Pathogen growth on TCS foods delivered above safe temperature',
    'Cold TCS ≤41°F (5°C) on receipt; frozen solid; hot TCS ≥135°F (57°C)',
    'Probe thermometer reading on every TCS delivery; visual inspection of packaging and frozen state',
    'Reject delivery; document with photo; notify supplier; record on delivery log',
    'Daily review of receiving log by Kitchen Manager; weekly thermometer calibration',
    'biological', 'every delivery', 'canonical', 2, 1
  ),
  (
    v_plan_id, 'CCP-02', 'Cold Storage',
    'Pathogen growth in TCS foods held above 41°F',
    'Internal temperature ≤41°F (5°C) — CalCode §113996; FDA Food Code 3-501.16',
    'Walk-in and reach-in refrigeration temperature check; ambient air temperature plus probe of representative TCS item',
    'Move TCS to working unit; assess time-out-of-temp; discard if >4hr above 41°F; service call on failed unit',
    'Daily temperature log review; monthly thermometer calibration',
    'biological', 'at least twice daily', 'canonical', 2, 2
  ),
  (
    v_plan_id, 'CCP-03', 'Cold Holding',
    'Pathogen growth in TCS foods on service line above 41°F',
    'Internal temperature ≤41°F (5°C) — CalCode §113996; FDA Food Code 3-501.16',
    'Probe internal temperature of TCS items in cold wells, salad bars, prep tables',
    'Discard if >4hr above 41°F; move to working cold unit; ice down service line',
    'Per-shift temperature log review by Kitchen Manager',
    'biological', 'every 4 hours during service', 'canonical', 2, 3
  ),
  (
    v_plan_id, 'CCP-04', 'Hot Holding',
    'Pathogen growth in TCS foods held below 135°F',
    'Internal temperature ≥135°F (57°C) — CalCode §113996; FDA Food Code 3-501.16',
    'Probe internal temperature of TCS items in steam tables, hot wells, holding cabinets',
    'Reheat to 165°F within 2hr if time permits; discard if held below 135°F >4hr',
    'Per-shift temperature log review',
    'biological', 'every 4 hours during service', 'canonical', 2, 4
  ),
  (
    v_plan_id, 'CCP-05', 'Cooling',
    'Pathogen growth during cooling of TCS foods through danger zone',
    '135°F to 70°F within 2 hours; 70°F to 41°F within 4 additional hours — CalCode §114002; FDA Food Code 3-501.14',
    'Probe internal temperature at start of cooling, at 2-hour mark (must be ≤70°F), and at 6-hour mark (must be ≤41°F)',
    'If >70°F at 2hr: reheat to 165°F and restart cooling once; if fails again, discard. If >41°F at 6hr: discard.',
    'Cooldown event review by Kitchen Manager; weekly thermometer calibration',
    'biological', 'every cooling event', 'canonical', 2, 5
  ),
  (
    v_plan_id, 'CCP-06', 'Reheating',
    'Survival of pathogens in previously cooked and cooled TCS foods',
    'Internal temperature ≥165°F (74°C) within 2 hours, held for 15 seconds — CalCode §114014; FDA Food Code 3-403.11',
    'Probe internal temperature at thickest part of item before service',
    'Continue reheating until ≥165°F; discard if cannot reach within 2hr',
    'Per-shift reheating log review',
    'biological', 'every reheating event', 'canonical', 2, 6
  );

  RETURN v_plan_id;
END;
$fn$;

-- ─── C. Backfill existing organizations ─────────────────────────────
DO $backfill$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM organizations
    WHERE id NOT IN (
      SELECT organization_id FROM haccp_plans
      WHERE status = 'active'
        AND name = 'Operational HACCP — California Retail Food Code'
    )
  LOOP
    PERFORM fn_seed_canonical_haccp(r.id);
  END LOOP;
END $backfill$;

-- ─── Register migration ─────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260525200000');

COMMIT;
