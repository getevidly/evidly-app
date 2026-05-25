-- =====================================================================
-- temperature_equipment → CCP tagging (Phase 1: schema + backfill)
-- =====================================================================
-- 0. Drop dependent views (unified_temp_readings_granular, _current)
-- A. Drop unused smallint ccp_number column
-- B. Normalize equipment_type variant 'holding_cold' → 'cold_holding'
-- C. Add ccp_id FK to haccp_critical_control_points
-- D. Create fn_map_equipment_type_to_ccp() mapping function
-- E. Backfill ccp_id for existing rows
-- F. Verify all rows backfilled (NOT NULL will fail if any NULL)
-- G. Enforce NOT NULL on ccp_id
-- H. Recreate both views with ccp_id join replacing te.ccp_number
-- =====================================================================

BEGIN;

-- ─── 0. Drop dependent views ────────────────────────────────────────
DROP VIEW IF EXISTS unified_temp_readings_current;
DROP VIEW IF EXISTS unified_temp_readings_granular;

-- ─── A. Drop unused smallint ccp_number column ──────────────────────
ALTER TABLE temperature_equipment DROP COLUMN IF EXISTS ccp_number;

-- ─── B. Normalize equipment_type variant ─────────────────────────────
UPDATE temperature_equipment
  SET equipment_type = 'cold_holding'
  WHERE equipment_type = 'holding_cold';

-- ─── C. Add ccp_id column (nullable for backfill) ───────────────────
ALTER TABLE temperature_equipment
  ADD COLUMN ccp_id uuid REFERENCES haccp_critical_control_points(id);

CREATE INDEX idx_temperature_equipment_ccp_id
  ON temperature_equipment(ccp_id);

-- ─── D. Equipment_type → CCP mapping function ───────────────────────
CREATE OR REPLACE FUNCTION fn_map_equipment_type_to_ccp(p_equipment_type text)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $fn$
BEGIN
  RETURN CASE p_equipment_type
    -- CCP-01 Receiving
    WHEN 'receiving' THEN 'CCP-01'
    -- CCP-02 Cold Storage
    WHEN 'walk_in_cooler'    THEN 'CCP-02'
    WHEN 'walk_in_freezer'   THEN 'CCP-02'
    WHEN 'reach_in_cooler'   THEN 'CCP-02'
    WHEN 'reach_in_freezer'  THEN 'CCP-02'
    WHEN 'cold_storage'      THEN 'CCP-02'
    -- CCP-03 Cold Holding
    WHEN 'cold_holding'      THEN 'CCP-03'
    WHEN 'cold_well'         THEN 'CCP-03'
    WHEN 'salad_bar'         THEN 'CCP-03'
    WHEN 'prep_table_cold'   THEN 'CCP-03'
    -- CCP-04 Hot Holding
    WHEN 'hot_holding'       THEN 'CCP-04'
    WHEN 'steam_table'       THEN 'CCP-04'
    WHEN 'hot_well'          THEN 'CCP-04'
    WHEN 'holding_cabinet'   THEN 'CCP-04'
    WHEN 'warmer'            THEN 'CCP-04'
    -- CCP-05 Cooling
    WHEN 'blast_chiller'     THEN 'CCP-05'
    WHEN 'cooling'           THEN 'CCP-05'
    -- CCP-06 Reheating
    WHEN 'reheating'         THEN 'CCP-06'
    WHEN 'oven_reheat'       THEN 'CCP-06'
    -- No match
    ELSE NULL
  END;
END;
$fn$;

-- ─── E. Backfill ccp_id for existing rows ───────────────────────────
UPDATE temperature_equipment te
SET ccp_id = ccp.id
FROM haccp_critical_control_points ccp
JOIN haccp_plans p ON ccp.plan_id = p.id
WHERE p.organization_id = te.organization_id
  AND p.status = 'active'
  AND p.name = 'Operational HACCP — California Retail Food Code'
  AND ccp.ccp_number = fn_map_equipment_type_to_ccp(te.equipment_type);

-- ─── G. Enforce NOT NULL (fails if any row has NULL ccp_id) ─────────
ALTER TABLE temperature_equipment ALTER COLUMN ccp_id SET NOT NULL;

-- ─── H. Recreate unified_temp_readings_granular ─────────────────────
CREATE VIEW unified_temp_readings_granular AS
-- Branch 1: equipment readings (no food_batch)
SELECT tl.id,
    'equipment'::text AS reading_source,
    tl.log_type AS reading_type,
    tl.facility_id AS location_id,
    te.zone_id,
    tl.equipment_id,
    te.name AS equipment_name,
    NULL::text AS food_item_name,
    NULL::text AS vendor_name,
    NULL::uuid AS food_batch_id,
    NULL::uuid AS cooldown_log_id,
    NULL::integer AS cooldown_stage,
    ccp.ccp_number,
    tl.temperature,
    tl.required_min,
    tl.required_max,
    tl.temp_pass,
    tl.input_method,
    tl.shift,
    tl.reading_time AS recorded_at,
    tl.logged_by AS recorded_by,
    tl.notes,
    tl.photo_url,
    tl.corrective_action,
    tl.created_at
FROM temperature_logs tl
  LEFT JOIN temperature_equipment te ON tl.equipment_id = te.id
  LEFT JOIN haccp_critical_control_points ccp ON te.ccp_id = ccp.id
WHERE tl.food_batch_id IS NULL

UNION ALL

-- Branch 2: food batch readings
SELECT tl.id,
    'food'::text AS reading_source,
    tl.log_type AS reading_type,
    tl.facility_id AS location_id,
    fb.zone_id,
    tl.equipment_id,
    te.name AS equipment_name,
    fb.food_item_name,
    NULL::text AS vendor_name,
    tl.food_batch_id,
    NULL::uuid AS cooldown_log_id,
    NULL::integer AS cooldown_stage,
    COALESCE(ccp.ccp_number,
        CASE tl.log_type
            WHEN 'reheating'::text    THEN 'CCP-06'
            WHEN 'hot_holding'::text  THEN 'CCP-04'
            WHEN 'cold_holding'::text THEN 'CCP-03'
            ELSE NULL
        END) AS ccp_number,
    tl.temperature,
    tl.required_min,
    tl.required_max,
    tl.temp_pass,
    tl.input_method,
    tl.shift,
    tl.reading_time AS recorded_at,
    tl.logged_by AS recorded_by,
    tl.notes,
    tl.photo_url,
    tl.corrective_action,
    tl.created_at
FROM temperature_logs tl
  LEFT JOIN temperature_equipment te ON tl.equipment_id = te.id
  LEFT JOIN haccp_critical_control_points ccp ON te.ccp_id = ccp.id
  LEFT JOIN food_batches fb ON tl.food_batch_id = fb.id
WHERE tl.food_batch_id IS NOT NULL

UNION ALL

-- Branch 3: receiving temp logs
SELECT rtl.id,
    'receiving'::text AS reading_source,
    'receiving'::text AS reading_type,
    rtl.location_id,
    NULL::uuid AS zone_id,
    NULL::uuid AS equipment_id,
    rtl.item_description AS equipment_name,
    rtl.item_description AS food_item_name,
    rtl.vendor_name,
    rtl.food_batch_id,
    NULL::uuid AS cooldown_log_id,
    NULL::integer AS cooldown_stage,
    'CCP-01' AS ccp_number,
    rtl.temperature_value AS temperature,
    NULL::numeric AS required_min,
    NULL::numeric AS required_max,
    rtl.is_pass AS temp_pass,
    COALESCE(rtl.input_method, 'manual'::text) AS input_method,
    NULL::text AS shift,
    COALESCE(rtl.delivery_time, rtl.created_at) AS recorded_at,
    rtl.received_by AS recorded_by,
    rtl.notes,
    rtl.photo_url,
    rtl.corrective_action,
    rtl.created_at
FROM receiving_temp_logs rtl

UNION ALL

-- Branch 4: cooldown temp checks
SELECT ctc.id,
    'cooldown'::text AS reading_source,
    'cooling'::text AS reading_type,
    cl.location_id,
    NULL::uuid AS zone_id,
    NULL::uuid AS equipment_id,
    cl.food_item_name AS equipment_name,
    cl.food_item_name,
    NULL::text AS vendor_name,
    cl.food_batch_id,
    cl.id AS cooldown_log_id,
    ctc.stage AS cooldown_stage,
    'CCP-05' AS ccp_number,
    ctc.temperature_value AS temperature,
    NULL::numeric AS required_min,
    CASE ctc.stage
        WHEN 1 THEN cl.stage1_target_temp
        WHEN 2 THEN cl.stage2_target_temp
        ELSE NULL::numeric
    END AS required_max,
    CASE
        WHEN ctc.stage = 1 AND ctc.temperature_value <= cl.stage1_target_temp THEN true
        WHEN ctc.stage = 2 AND ctc.temperature_value <= cl.stage2_target_temp THEN true
        ELSE NULL::boolean
    END AS temp_pass,
    'manual'::text AS input_method,
    NULL::text AS shift,
    ctc.check_time AS recorded_at,
    cl.recorded_by,
    cl.notes,
    NULL::text AS photo_url,
    NULL::text AS corrective_action,
    ctc.created_at
FROM cooldown_temp_checks ctc
  JOIN cooldown_logs cl ON ctc.cooldown_log_id = cl.id;

-- ─── H2. Recreate unified_temp_readings_current ─────────────────────
CREATE VIEW unified_temp_readings_current AS
-- Branch 1: latest equipment reading per equipment
SELECT ranked.id,
    ranked.reading_source,
    ranked.reading_type,
    ranked.location_id,
    ranked.zone_id,
    ranked.equipment_id,
    ranked.equipment_name,
    ranked.food_item_name,
    ranked.vendor_name,
    ranked.food_batch_id,
    ranked.cooldown_log_id,
    ranked.cooldown_stage,
    ranked.ccp_number,
    ranked.temperature,
    ranked.required_min,
    ranked.required_max,
    ranked.temp_pass,
    ranked.input_method,
    ranked.shift,
    ranked.recorded_at,
    ranked.recorded_by,
    ranked.notes,
    ranked.photo_url,
    ranked.corrective_action,
    ranked.created_at
FROM ( SELECT tl.id,
        'equipment'::text AS reading_source,
        tl.log_type AS reading_type,
        te.location_id,
        te.zone_id,
        te.id AS equipment_id,
        te.name AS equipment_name,
        NULL::text AS food_item_name,
        NULL::text AS vendor_name,
        NULL::uuid AS food_batch_id,
        NULL::uuid AS cooldown_log_id,
        NULL::integer AS cooldown_stage,
        ccp.ccp_number,
        tl.temperature,
        tl.required_min,
        tl.required_max,
        tl.temp_pass,
        tl.input_method,
        tl.shift,
        tl.reading_time AS recorded_at,
        tl.logged_by AS recorded_by,
        tl.notes,
        tl.photo_url,
        tl.corrective_action,
        tl.created_at,
        row_number() OVER (PARTITION BY te.id ORDER BY tl.reading_time DESC) AS rn
    FROM temperature_equipment te
      JOIN temperature_logs tl ON tl.equipment_id = te.id
      JOIN haccp_critical_control_points ccp ON te.ccp_id = ccp.id
    WHERE te.is_active = true AND tl.food_batch_id IS NULL) ranked
WHERE ranked.rn = 1

UNION ALL

-- Branch 2: latest food batch reading per active batch
SELECT ranked.id,
    ranked.reading_source,
    ranked.reading_type,
    ranked.location_id,
    ranked.zone_id,
    ranked.equipment_id,
    ranked.equipment_name,
    ranked.food_item_name,
    ranked.vendor_name,
    ranked.food_batch_id,
    ranked.cooldown_log_id,
    ranked.cooldown_stage,
    ranked.ccp_number,
    ranked.temperature,
    ranked.required_min,
    ranked.required_max,
    ranked.temp_pass,
    ranked.input_method,
    ranked.shift,
    ranked.recorded_at,
    ranked.recorded_by,
    ranked.notes,
    ranked.photo_url,
    ranked.corrective_action,
    ranked.created_at
FROM ( SELECT tl.id,
        'food'::text AS reading_source,
        tl.log_type AS reading_type,
        fb.location_id,
        fb.zone_id,
        tl.equipment_id,
        te.name AS equipment_name,
        fb.food_item_name,
        NULL::text AS vendor_name,
        fb.id AS food_batch_id,
        NULL::uuid AS cooldown_log_id,
        NULL::integer AS cooldown_stage,
        COALESCE(ccp.ccp_number,
            CASE tl.log_type
                WHEN 'reheating'::text    THEN 'CCP-06'
                WHEN 'hot_holding'::text  THEN 'CCP-04'
                WHEN 'cold_holding'::text THEN 'CCP-03'
                ELSE NULL
            END) AS ccp_number,
        tl.temperature,
        tl.required_min,
        tl.required_max,
        tl.temp_pass,
        tl.input_method,
        tl.shift,
        tl.reading_time AS recorded_at,
        tl.logged_by AS recorded_by,
        tl.notes,
        tl.photo_url,
        tl.corrective_action,
        tl.created_at,
        row_number() OVER (PARTITION BY fb.id ORDER BY tl.reading_time DESC) AS rn
    FROM food_batches fb
      JOIN temperature_logs tl ON tl.food_batch_id = fb.id
      LEFT JOIN temperature_equipment te ON tl.equipment_id = te.id
      LEFT JOIN haccp_critical_control_points ccp ON te.ccp_id = ccp.id
    WHERE fb.is_active = true AND fb.current_status <> ALL (ARRAY['served'::food_batch_status, 'discarded'::food_batch_status])) ranked
WHERE ranked.rn = 1

UNION ALL

-- Branch 3: latest receiving temp log per vendor+day
SELECT ranked.id,
    ranked.reading_source,
    ranked.reading_type,
    ranked.location_id,
    ranked.zone_id,
    ranked.equipment_id,
    ranked.equipment_name,
    ranked.food_item_name,
    ranked.vendor_name,
    ranked.food_batch_id,
    ranked.cooldown_log_id,
    ranked.cooldown_stage,
    ranked.ccp_number,
    ranked.temperature,
    ranked.required_min,
    ranked.required_max,
    ranked.temp_pass,
    ranked.input_method,
    ranked.shift,
    ranked.recorded_at,
    ranked.recorded_by,
    ranked.notes,
    ranked.photo_url,
    ranked.corrective_action,
    ranked.created_at
FROM ( SELECT rtl.id,
        'receiving'::text AS reading_source,
        'receiving'::text AS reading_type,
        rtl.location_id,
        NULL::uuid AS zone_id,
        NULL::uuid AS equipment_id,
        rtl.item_description AS equipment_name,
        rtl.item_description AS food_item_name,
        rtl.vendor_name,
        rtl.food_batch_id,
        NULL::uuid AS cooldown_log_id,
        NULL::integer AS cooldown_stage,
        'CCP-01' AS ccp_number,
        rtl.temperature_value AS temperature,
        NULL::numeric AS required_min,
        NULL::numeric AS required_max,
        rtl.is_pass AS temp_pass,
        COALESCE(rtl.input_method, 'manual'::text) AS input_method,
        NULL::text AS shift,
        COALESCE(rtl.delivery_time, rtl.created_at) AS recorded_at,
        rtl.received_by AS recorded_by,
        rtl.notes,
        rtl.photo_url,
        rtl.corrective_action,
        rtl.created_at,
        row_number() OVER (PARTITION BY rtl.vendor_name, (rtl.delivery_time::date) ORDER BY (COALESCE(rtl.delivery_time, rtl.created_at)) DESC) AS rn
    FROM receiving_temp_logs rtl
    WHERE COALESCE(rtl.delivery_time, rtl.created_at) > (now() - '24:00:00'::interval)) ranked
WHERE ranked.rn = 1

UNION ALL

-- Branch 4: latest cooldown temp check per active cooldown log
SELECT ranked.id,
    ranked.reading_source,
    ranked.reading_type,
    ranked.location_id,
    ranked.zone_id,
    ranked.equipment_id,
    ranked.equipment_name,
    ranked.food_item_name,
    ranked.vendor_name,
    ranked.food_batch_id,
    ranked.cooldown_log_id,
    ranked.cooldown_stage,
    ranked.ccp_number,
    ranked.temperature,
    ranked.required_min,
    ranked.required_max,
    ranked.temp_pass,
    ranked.input_method,
    ranked.shift,
    ranked.recorded_at,
    ranked.recorded_by,
    ranked.notes,
    ranked.photo_url,
    ranked.corrective_action,
    ranked.created_at
FROM ( SELECT ctc.id,
        'cooldown'::text AS reading_source,
        'cooling'::text AS reading_type,
        cl.location_id,
        NULL::uuid AS zone_id,
        NULL::uuid AS equipment_id,
        cl.food_item_name AS equipment_name,
        cl.food_item_name,
        NULL::text AS vendor_name,
        cl.food_batch_id,
        cl.id AS cooldown_log_id,
        ctc.stage AS cooldown_stage,
        'CCP-05' AS ccp_number,
        ctc.temperature_value AS temperature,
        NULL::numeric AS required_min,
        CASE ctc.stage
            WHEN 1 THEN cl.stage1_target_temp
            WHEN 2 THEN cl.stage2_target_temp
            ELSE NULL::numeric
        END AS required_max,
        CASE
            WHEN ctc.stage = 1 AND ctc.temperature_value <= cl.stage1_target_temp THEN true
            WHEN ctc.stage = 2 AND ctc.temperature_value <= cl.stage2_target_temp THEN true
            ELSE NULL::boolean
        END AS temp_pass,
        'manual'::text AS input_method,
        NULL::text AS shift,
        ctc.check_time AS recorded_at,
        cl.recorded_by,
        cl.notes,
        NULL::text AS photo_url,
        NULL::text AS corrective_action,
        ctc.created_at,
        row_number() OVER (PARTITION BY cl.id ORDER BY ctc.check_time DESC) AS rn
    FROM cooldown_logs cl
      JOIN cooldown_temp_checks ctc ON ctc.cooldown_log_id = cl.id
    WHERE cl.status = 'active'::text) ranked
WHERE ranked.rn = 1;

-- ─── Register migration ─────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260525210000');

COMMIT;
