-- ═══════════════════════════════════════════════════════════════════════
-- BERKELEY — Correct fire_ahj_name: Alameda County Fire → Berkeley Fire
--
-- Berkeley is an independent city jurisdiction with its own fire
-- department. Alameda County Fire does not serve the City of Berkeley.
-- This is the same Alameda-data contamination already corrected in
-- agency_name, grading_type and grading_config (migration 20261113).
--
-- Only fire_ahj_name is changed. No other column is touched.
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_jur_id          UUID;
  v_batch_id        UUID := gen_random_uuid();
  v_old_fire_ahj    TEXT;
  v_new_fire_ahj    TEXT := 'Berkeley Fire Department';
  v_edit_reason     TEXT := 'Correct Alameda County contamination. Berkeley is an independent city jurisdiction with its own fire department; Alameda County Fire does not serve Berkeley.';
BEGIN
  -- ── 1. Fetch current row ──────────────────────────────────────────
  SELECT id, fire_ahj_name
    INTO v_jur_id, v_old_fire_ahj
    FROM jurisdictions
   WHERE city = 'Berkeley'
     AND state = 'CA'
     AND is_active = true
   LIMIT 1;

  IF v_jur_id IS NULL THEN
    RAISE EXCEPTION 'No active Berkeley CA jurisdiction row found';
  END IF;

  -- Guard: skip if already correct
  IF v_old_fire_ahj = v_new_fire_ahj THEN
    RAISE NOTICE 'fire_ahj_name already reads "%" — nothing to do.', v_new_fire_ahj;
    RETURN;
  END IF;

  -- ── 2. History-first: audit row BEFORE update ─────────────────────
  INSERT INTO jurisdiction_edits (
    jurisdiction_id, county, batch_id,
    field_name, old_value, new_value,
    edited_by, edit_reason
  ) VALUES (
    v_jur_id, 'Alameda', v_batch_id,
    'fire_ahj_name',
    to_jsonb(v_old_fire_ahj),
    to_jsonb(v_new_fire_ahj),
    'platform_admin', v_edit_reason
  );

  -- ── 3. Apply the change ──────────────────────────────────────────
  UPDATE jurisdictions
     SET fire_ahj_name = v_new_fire_ahj
   WHERE id = v_jur_id;

  RAISE NOTICE 'Berkeley fire_ahj_name corrected. batch_id = %', v_batch_id;
END $$;
