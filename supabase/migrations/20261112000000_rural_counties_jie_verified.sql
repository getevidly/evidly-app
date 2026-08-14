-- ═══════════════════════════════════════════════════════════════════════
-- RURAL COUNTIES — Flip 23 verified counties from needs_review to verified
--
-- All 23 are grading_type=none rural CA counties confirmed against
-- county primary sources: no placard, no letter grade, no public score.
-- El Dorado and Mariposa are already verified — not touched.
--
-- History-first: jurisdiction_edits rows inserted BEFORE the update.
-- Guard: counties already at 'verified' are skipped (idempotent).
-- Only jie_audit_status is changed — no other column is touched.
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_batch_id  UUID := gen_random_uuid();
  v_county    TEXT;
  v_jur_id    UUID;
  v_old_val   TEXT;
  v_affected  INT := 0;
  v_counties  TEXT[] := ARRAY[
    'Alpine', 'Amador', 'Calaveras', 'Colusa', 'Del Norte',
    'Glenn', 'Humboldt', 'Inyo', 'Lake', 'Lassen',
    'Mendocino', 'Modoc', 'Mono', 'Nevada', 'Plumas',
    'San Benito', 'Shasta', 'Sierra', 'Siskiyou', 'Tehama',
    'Trinity', 'Tuolumne', 'Yuba'
  ];
BEGIN
  FOREACH v_county IN ARRAY v_counties
  LOOP
    -- Fetch current row
    SELECT id, jie_audit_status
      INTO v_jur_id, v_old_val
      FROM jurisdictions
     WHERE state = 'CA'
       AND county = v_county
       AND is_active = true
     LIMIT 1;

    -- Skip if row not found
    IF v_jur_id IS NULL THEN
      RAISE NOTICE 'SKIP % — no active row found', v_county;
      CONTINUE;
    END IF;

    -- Guard: skip if already verified (idempotent)
    IF v_old_val = 'verified' THEN
      RAISE NOTICE 'SKIP % — already verified', v_county;
      CONTINUE;
    END IF;

    -- ── History-first: audit row BEFORE update ──────────────────────
    INSERT INTO jurisdiction_edits (
      jurisdiction_id, county, batch_id,
      field_name, old_value, new_value,
      edited_by, edit_reason
    ) VALUES (
      v_jur_id, v_county, v_batch_id,
      'jie_audit_status',
      to_jsonb(v_old_val),
      to_jsonb('verified'::text),
      'platform_admin',
      'Verified against county primary sources; grading_type none confirmed (no placard, letter grade or public score).'
    );

    -- ── Update ONLY jie_audit_status ────────────────────────────────
    UPDATE jurisdictions
       SET jie_audit_status = 'verified'
     WHERE id = v_jur_id;

    v_affected := v_affected + 1;
  END LOOP;

  RAISE NOTICE '% counties flipped to verified. batch_id = %', v_affected, v_batch_id;
END $$;
