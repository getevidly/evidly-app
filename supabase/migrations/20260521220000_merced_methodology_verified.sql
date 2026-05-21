-- Step 5C: Merced County methodology verified against primary sources
-- Fire code edition contradiction resolved, legal authority documented,
-- violation weights verified, tier color provenance flagged, confidence bumped.

BEGIN;

-- UPDATE 1: Resolve fire_code_edition contradiction
-- Codified ordinance (Ch 16.30) adopts 2022 CFC; 2025 CFC applies by state default (HSC §17958)
UPDATE jurisdictions
SET fire_code_edition = '2022 CFC',
    fire_jurisdiction_config = fire_jurisdiction_config
      || jsonb_build_object(
        'cfc_2025_state_default', true,
        'cfc_2025_local_adoption_status', 'not_adopted_locally',
        'cfc_2025_evidence', jsonb_build_object(
          'codified_ordinance', 'Merced County Code Ch 16.30 adopts 2022 CFC',
          'state_default_law', 'HSC §17958 — 2025 CFC applies statewide where no local modification',
          'last_board_review_through', '2026-03',
          'verified_date', '2026-05-21'
        )
      )
WHERE county = 'Merced' AND state = 'CA';

-- UPDATE 2: Resolve local ordinance flag — no standalone ordinance exists;
-- authority is departmental policy under CalCode §113709 + County Code Ch 9.42
UPDATE jurisdictions
SET grading_config = grading_config
  || jsonb_build_object(
    'authority', COALESCE(grading_config->'authority', '{}'::jsonb) || jsonb_build_object(
      'local_code', 'CalCode §113709 enabling provision + Merced County Code Ch 9.42 Health Officer enforcement authority',
      'local_code_followup_needed', null,
      'rating_system_legal_basis', 'departmental_policy_under_state_enabling',
      'authority_documented_in', 'Merced County Food Program Ratings/Inspection Procedures (policy #31099, rev. Jan 4 2022)'
    ),
    'source_documents', COALESCE(grading_config->'source_documents', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'title', 'Merced County Food Program Ratings/Inspection Procedures (Point System Policy)',
        'document_id', '31099',
        'revision_date', '2022-01-04',
        'captured_date', '2026-05-21',
        'live_url', 'https://www.countyofmerced.com/DocumentCenter/View/31099/',
        'purpose', 'Primary methodology document — defines point system, three-tier ratings, repeat penalty, closure rules',
        'document_type', 'departmental_policy'
      )
    ),
    'source_documents_needed', '[]'::jsonb
  )
WHERE county = 'Merced' AND state = 'CA';

-- UPDATE 3: Tier color provenance + violation weight evidence
-- Colors are display convention (not sourced from Merced docs)
-- Violation weights 7/3/1 verified from actual public inspection records
UPDATE jurisdictions
SET grading_config = jsonb_set(
    grading_config,
    '{grading_thresholds}',
    COALESCE(grading_config->'grading_thresholds', '{}'::jsonb) || jsonb_build_object(
      'color_provenance', 'display_convention',
      'color_primary_source_verified', false,
      'color_note', 'Green/Yellow/Red mapping follows standard food safety convention; not explicitly mapped in policy #31099'
    )
  ) || jsonb_build_object(
    'violation_weight_evidence', jsonb_build_object(
      'verification_method', 'reverse_engineered_from_public_inspection_records',
      'verified_date', '2026-05-21',
      'evidence_samples', jsonb_build_array(
        jsonb_build_object('facility', 'Sugoi Sushi', 'facility_id', 'FA0006344', 'violation_type', 'major (food contact, time-only controls, temp holding)', 'point_value', 7.00),
        jsonb_build_object('facility', 'Sugoi Sushi', 'facility_id', 'FA0006344', 'violation_type', 'minor (time labeling PHF)', 'point_value', 3.00),
        jsonb_build_object('facility', 'Club Demo/Costco', 'facility_id', 'FA0009828', 'violation_type', 'minor (food safety certification)', 'point_value', 3.00),
        jsonb_build_object('facility', 'Domino''s', 'facility_id', 'FA0005026', 'violation_type', 'GRP (signage)', 'point_value', 1.00)
      )
    )
  )
WHERE county = 'Merced' AND state = 'CA';

-- UPDATE 4: Verification fields + confidence score
UPDATE jurisdictions
SET last_verified = '2026-05-21',
    jie_verified_date = '2026-05-21',
    jie_verified_source = 'Merced County Food Program Ratings/Inspection Procedures (policy #31099) + public inspection records + Merced County Code Ch 9.42 + Ch 16.30',
    jie_audit_status = 'verified',
    confidence_score = 92
WHERE county = 'Merced' AND state = 'CA';

COMMIT;
