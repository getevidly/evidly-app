-- ═══════════════════════════════════════════════════════════════════════
-- BERKELEY — Correct jurisdiction row: remove fabricated Alameda County
-- letter-grade config, set to calcode_narrative (report-only) per the
-- row's own scoring_methodology and berkeleyca.gov primary source.
--
-- Berkeley operates an independent city-level EHD under the Health,
-- Housing, and Community Services Department. It issues NO placard,
-- NO numeric score, and NO letter grade. The grading_config was
-- overwritten with Alameda County's config on 2026-11-04, undoing a
-- prior May 2026 correction. This migration restores the correct state.
--
-- Schema follows Santa Cruz (grading_type 'none', evaluation_method
-- 'calcode_narrative') for structural consistency.
--
-- fire_ahj_name is NOT changed here — currently 'Alameda County Fire
-- Department' but Berkeley has its own fire department. Flagged for
-- separate correction.
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_jur_id          UUID;
  v_batch_id        UUID := gen_random_uuid();
  v_old_grading_type    TEXT;
  v_old_agency_name     TEXT;
  v_old_grading_config  JSONB;
  v_new_grading_config  JSONB;
  v_new_agency_name     TEXT := 'City of Berkeley, Division of Environmental Health';
  v_new_grading_type    TEXT := 'none';
  v_edit_reason         TEXT := 'Correct fabricated Alameda County letter-grade config. Berkeley issues no placard, no score, no letter grade per berkeleyca.gov primary source and the row''s own scoring_methodology field. Config follows Santa Cruz calcode_narrative schema.';
BEGIN
  -- ── 1. Fetch current row ──────────────────────────────────────────
  SELECT id, grading_type, agency_name, grading_config
    INTO v_jur_id, v_old_grading_type, v_old_agency_name, v_old_grading_config
    FROM jurisdictions
   WHERE city = 'Berkeley'
     AND state = 'CA'
     AND is_active = true
   LIMIT 1;

  IF v_jur_id IS NULL THEN
    RAISE EXCEPTION 'No active Berkeley CA jurisdiction row found';
  END IF;

  -- ── 2. Build correct grading_config (Santa Cruz schema) ──────────
  v_new_grading_config := '{
    "authority": {
      "state": "California Retail Food Code (Health & Safety Code Division 104, Part 7, Chapter 1 et seq.)",
      "local_code": "Berkeley Municipal Code Chapter 11.28 — Food Establishments (Ord. 7739-NS § 1, 2020), adopting CalCode by reference under BMC §11.28.010."
    },
    "agency_contact": {
      "email": "envhealth@berkeleyca.gov",
      "phone": "(510) 981-5310",
      "fax": "(510) 981-5305",
      "address": "2180 Milvia St., 2nd Floor, Berkeley, CA 94704",
      "parent_department": "City of Berkeley, Health, Housing, and Community Services Department",
      "web_presence": {
        "primary": "https://berkeleyca.gov/doing-business/operating-berkeley/food-service/food-safety-and-inspection-program"
      }
    },
    "display_format": "none",
    "produces_score": false,
    "produces_placard": false,
    "produces_letter_grade": false,
    "schema_version": "2026-08-14",
    "evaluation_method": "calcode_narrative",
    "source_documents": [
      {
        "type": "city_program_page",
        "title": "Food Safety and Inspection Program — City of Berkeley",
        "purpose": "Primary source confirming Berkeley operates independent city-level EHD; inspects all retail food, mobile, temporary, and school kitchens; issues narrative inspection reports with no placard, no score, no letter grade.",
        "live_url": "https://berkeleyca.gov/doing-business/operating-berkeley/food-service/food-safety-and-inspection-program",
        "publisher": "City of Berkeley",
        "captured_date": "2026-05-21"
      }
    ],
    "grading_thresholds": {
      "tiers": [],
      "schema": "no_score_no_grade",
      "applicable": false,
      "rationale": "Berkeley issues no placard, no numeric score, and no letter grade. Inspection output is a narrative CalCode report available by request from the Division of Environmental Health. There is no public-facing inspection portal. Berkeley is one of three California cities (with Pasadena and Long Beach) operating an independent municipal health department separate from county authority."
    },
    "inspection_report_name": "Food Facility Inspection Report (CalCode)",
    "inspection_report_access": {
      "model": "request_from_ehd",
      "contact_email": "envhealth@berkeleyca.gov",
      "contact_phone": "(510) 981-5310",
      "note": "No public-facing inspection portal. Copies obtained by contacting the Division of Environmental Health."
    },
    "local_deltas_vs_calcode": [
      "BMC §11.28.220: Refrigeration at or below 40°F (textually stricter than CalCode 41°F; in practice CalCode adoption is the operative standard).",
      "BMC §11.28.370: Microenterprise Home Kitchen Operation (MHKO) provisions requiring Fire Marshall approval for commercial equipment in residential settings and annual inspection cycle.",
      "Independent municipal health department — one of three CA cities (Berkeley, Pasadena, Long Beach) not served by county EHD."
    ],
    "violation_classification": {
      "basis": "CalCode §113725",
      "major": "Imminent health hazard requiring immediate correction; may warrant closure.",
      "minor": "Non-imminent violations requiring correction within timeframe specified by inspector."
    },
    "cdc_five_risk_factors": [
      "Food from unsafe sources",
      "Inadequate cooking temperatures",
      "Improper holding temperatures",
      "Contaminated equipment",
      "Poor employee hygiene"
    ],
    "archive_action_needed": false
  }'::jsonb;

  -- ── 3. History-first: audit rows BEFORE update ────────────────────

  -- 3a. grading_type
  IF v_old_grading_type IS DISTINCT FROM v_new_grading_type THEN
    INSERT INTO jurisdiction_edits (
      jurisdiction_id, county, batch_id,
      field_name, old_value, new_value,
      edited_by, edit_reason
    ) VALUES (
      v_jur_id, 'Alameda', v_batch_id,
      'grading_type',
      to_jsonb(v_old_grading_type),
      to_jsonb(v_new_grading_type),
      'platform_admin', v_edit_reason
    );
  END IF;

  -- 3b. agency_name
  IF v_old_agency_name IS DISTINCT FROM v_new_agency_name THEN
    INSERT INTO jurisdiction_edits (
      jurisdiction_id, county, batch_id,
      field_name, old_value, new_value,
      edited_by, edit_reason
    ) VALUES (
      v_jur_id, 'Alameda', v_batch_id,
      'agency_name',
      to_jsonb(v_old_agency_name),
      to_jsonb(v_new_agency_name),
      'platform_admin', v_edit_reason
    );
  END IF;

  -- 3c. grading_config
  INSERT INTO jurisdiction_edits (
    jurisdiction_id, county, batch_id,
    field_name, old_value, new_value,
    edited_by, edit_reason
  ) VALUES (
    v_jur_id, 'Alameda', v_batch_id,
    'grading_config',
    to_jsonb(v_old_grading_config),
    to_jsonb(v_new_grading_config),
    'platform_admin', v_edit_reason
  );

  -- ── 4. Apply the changes ──────────────────────────────────────────
  UPDATE jurisdictions
     SET grading_type    = v_new_grading_type,
         agency_name     = v_new_agency_name,
         grading_config  = v_new_grading_config
   WHERE id = v_jur_id;

  RAISE NOTICE 'Berkeley corrected. batch_id = %', v_batch_id;
  RAISE NOTICE 'NOTE: fire_ahj_name still reads "Alameda County Fire Department" — Berkeley has its own fire department. Flagged for separate correction.';
END $$;
