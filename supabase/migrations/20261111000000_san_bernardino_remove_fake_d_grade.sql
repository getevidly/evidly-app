-- ═══════════════════════════════════════════════════════════════════════
-- SAN BERNARDINO — Remove non-existent "D" grade from grading_config
--
-- San Bernardino County Code §33.1403 defines three letter grades:
--   A (90-100), B (80-89), C (70-79)
-- There is no "D" grade. A facility scoring below 70 receives a
-- closure notice and permit suspension — that is an enforcement
-- action, not a grade.
--
-- This migration removes ONLY the "D" key from grading_config.grades
-- via a targeted JSONB path delete. All other keys are untouched.
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_jur_id        UUID;
  v_county        TEXT := 'San Bernardino';
  v_old_config    JSONB;
  v_new_config    JSONB;
  v_batch_id      UUID := gen_random_uuid();
BEGIN
  -- ── 1. Fetch the row ──────────────────────────────────────────────
  SELECT id, grading_config
    INTO v_jur_id, v_old_config
    FROM jurisdictions
   WHERE state = 'CA'
     AND county = v_county
     AND is_active = true
   LIMIT 1;

  IF v_jur_id IS NULL THEN
    RAISE EXCEPTION 'No active jurisdiction row found for CA / %', v_county;
  END IF;

  -- Guard: only proceed if the "D" key actually exists
  IF NOT (v_old_config #> '{grades}' ? 'D') THEN
    RAISE NOTICE 'grades.D key not present — nothing to remove.';
    RETURN;
  END IF;

  -- ── 2. Remove grades.D via targeted JSONB path delete ─────────────
  v_new_config := v_old_config #- '{grades,D}';

  -- ── 3. Audit trail — write to jurisdiction_edits FIRST ────────────
  INSERT INTO jurisdiction_edits (
    jurisdiction_id, county, batch_id,
    field_name, old_value, new_value,
    edited_by, edit_reason
  ) VALUES (
    v_jur_id, v_county, v_batch_id,
    'grading_config',
    to_jsonb(v_old_config),
    to_jsonb(v_new_config),
    'platform_admin',
    'Remove non-existent "D" grade. SB County Code §33.1403 defines A/B/C only; below 70 is closure, not a grade.'
  );

  -- ── 4. Apply the change ───────────────────────────────────────────
  UPDATE jurisdictions
     SET grading_config = v_new_config
   WHERE id = v_jur_id;

  RAISE NOTICE 'San Bernardino grades.D removed. batch_id = %', v_batch_id;
END $$;
