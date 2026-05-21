-- =====================================================================
-- Migration: Add statute_deltas_vs_calcode to CA jurisdictions
-- Timestamp: 20260521210000
-- Sprint: Citations Architecture (CA Only) — Step 2.5
--
-- Separates methodology deltas (how jurisdiction scores/grades/enforces)
-- from statute deltas (where jurisdiction enforces a different threshold
-- than CalCode). Backfills 1 known statute delta (Berkeley BMC §11.28.220).
-- =====================================================================

-- 1. Add statute_deltas_vs_calcode as empty array to all 62 CA jurisdictions
UPDATE jurisdictions
SET grading_config = grading_config || jsonb_build_object('statute_deltas_vs_calcode', '[]'::jsonb)
WHERE state = 'CA'
  AND (grading_config->'statute_deltas_vs_calcode') IS NULL;

-- 2. Backfill Berkeley (bd7bbcbf): add structured statute delta entry
UPDATE jurisdictions
SET grading_config = jsonb_set(
  grading_config,
  '{statute_deltas_vs_calcode}',
  '[{
    "cites_section": "§113996",
    "cites_code_family": "CalCode",
    "delta_type": "stricter",
    "local_text": "BMC §11.28.220 specifies refrigeration at or below 40°F (textually stricter than CalCode 41°F). 1976 ordinance text predates the 2009 CalCode statutory base; CalCode adoption under BMC §11.28.010 (Ord. 7739-NS § 1, 2020) makes CalCode the operative reference standard in practice. Textual delta documented; operational delta likely zero.",
    "local_authority_name": "Berkeley Environmental Health",
    "local_source_url": "https://berkeley.municipal.codes/BMC/11.28.220",
    "local_ordinance_number": "BMC §11.28.220",
    "effective_date": "1976-01-01",
    "superseded_in_practice_by": "BMC §11.28.010 (CalCode adoption ordinance, 2020)",
    "operational_delta": "zero",
    "verified_by": "system_seed",
    "verified_at": "2026-05-21T19:30:00Z",
    "notes": "Textual delta only — CalCode operative in enforcement"
  }]'::jsonb
)
WHERE id = 'bd7bbcbf-0658-4908-9aa9-7cada20a5ec2';

-- 3. Remove the moved entry from local_deltas_vs_calcode (was index 3, text contains "BMC §11.28.220")
UPDATE jurisdictions
SET grading_config = jsonb_set(
  grading_config,
  '{local_deltas_vs_calcode}',
  (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(grading_config->'local_deltas_vs_calcode') AS elem
    WHERE elem::text NOT LIKE '%BMC §11.28.220%'
  )
)
WHERE id = 'bd7bbcbf-0658-4908-9aa9-7cada20a5ec2';

-- 4. Document the methodology vs statute split
COMMENT ON COLUMN jurisdictions.grading_config IS
  'JSONB methodology config. local_deltas_vs_calcode[] = methodology/scoring/enforcement deltas. statute_deltas_vs_calcode[] = structured statute-section threshold deltas (FK by string to citations.section_number).';

-- =====================================================================
-- Apply-time verification
-- =====================================================================
DO $$
DECLARE
  _ca_count int;
  _ca_with_field int;
  _berkeley_statute_count int;
  _berkeley_local_count int;
  _missing text[] := ARRAY[]::text[];
BEGIN
  -- All 62 CA jurisdictions have the new field
  SELECT COUNT(*) INTO _ca_count
  FROM jurisdictions WHERE state = 'CA';

  SELECT COUNT(*) INTO _ca_with_field
  FROM jurisdictions WHERE state = 'CA' AND grading_config ? 'statute_deltas_vs_calcode';

  IF _ca_with_field < _ca_count THEN
    _missing := array_append(_missing,
      format('statute_deltas_vs_calcode missing on %s of %s CA jurisdictions', _ca_count - _ca_with_field, _ca_count));
  END IF;

  -- Berkeley has 1 statute delta
  SELECT jsonb_array_length(grading_config->'statute_deltas_vs_calcode') INTO _berkeley_statute_count
  FROM jurisdictions WHERE id = 'bd7bbcbf-0658-4908-9aa9-7cada20a5ec2';

  IF _berkeley_statute_count IS NULL OR _berkeley_statute_count < 1 THEN
    _missing := array_append(_missing, 'Berkeley statute_deltas_vs_calcode is empty');
  END IF;

  -- Berkeley local_deltas_vs_calcode has 3 entries (was 4)
  SELECT jsonb_array_length(grading_config->'local_deltas_vs_calcode') INTO _berkeley_local_count
  FROM jurisdictions WHERE id = 'bd7bbcbf-0658-4908-9aa9-7cada20a5ec2';

  IF _berkeley_local_count IS NULL OR _berkeley_local_count != 3 THEN
    _missing := array_append(_missing,
      format('Berkeley local_deltas_vs_calcode expected 3, got %s', _berkeley_local_count));
  END IF;

  IF array_length(_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Step 2.5 verification failed: %', array_to_string(_missing, '; ');
  END IF;

  RAISE NOTICE 'PASS Step 2.5 — statute_deltas_vs_calcode on % CA jurisdictions, Berkeley backfill OK (1 statute, 3 local)', _ca_count;
END $$;
