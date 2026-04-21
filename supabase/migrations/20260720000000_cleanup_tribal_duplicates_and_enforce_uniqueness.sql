-- Migration: cleanup tribal duplicates, remove CA tribal (Option 1), add unique constraint
-- Context: Production accumulated 30 duplicate tribal rows from repeat seed runs.
-- CA tribal dropped entirely — 7 of ~109 is incomplete coverage. Revisit post-launch as dedicated CA tribal JIE buildout.
-- AZ tribal (9 rows) preserved as launch-ready coverage.

BEGIN;

-- Part 1: Delete duplicate tribal rows (slug IS NULL = dupe marker, confirmed by diagnosis)
-- On prod: removes 30 rows (21 CA + 9 AZ duplicates)
-- On staging: removes 0 rows (staging has no duplicates — every tribal row has slug populated)
DELETE FROM jurisdictions
WHERE governmental_level = 'tribal'
  AND slug IS NULL;

-- Part 2: Delete all remaining CA tribal rows (Option 1 — incomplete coverage, revisit post-launch)
-- On prod: removes 7 originals (Agua Caliente, Morongo, Pechanga, San Manuel, Santa Ynez, Table Mountain, Tachi-Yokut)
-- On staging: removes same 7 rows
DELETE FROM jurisdictions
WHERE state = 'CA'
  AND governmental_level = 'tribal';

-- Part 3: Add unique constraint preventing future duplicate inserts
-- (state, agency_name, governmental_level, county) must be unique
-- Note: 4-column composite handles NV's legitimate rural umbrella pattern
-- (13 rural counties under single state agency with distinct county values)
ALTER TABLE jurisdictions
  DROP CONSTRAINT IF EXISTS jurisdictions_state_agency_level_unique;

ALTER TABLE jurisdictions
  DROP CONSTRAINT IF EXISTS jurisdictions_state_agency_level_county_unique;

ALTER TABLE jurisdictions
  ADD CONSTRAINT jurisdictions_state_agency_level_county_unique
  UNIQUE (state, agency_name, governmental_level, county);

-- Part 4: Verification — migration fails loudly if end-state doesn't match expected counts
DO $verify$
DECLARE
  ca_total INT;
  ca_tribal INT;
  az_total INT;
  az_tribal INT;
  or_total INT;
  wa_total INT;
  nv_total INT;
  grand_total INT;
BEGIN
  SELECT COUNT(*) INTO ca_total FROM jurisdictions WHERE state='CA';
  SELECT COUNT(*) INTO ca_tribal FROM jurisdictions WHERE state='CA' AND governmental_level='tribal';
  SELECT COUNT(*) INTO az_total FROM jurisdictions WHERE state='AZ';
  SELECT COUNT(*) INTO az_tribal FROM jurisdictions WHERE state='AZ' AND governmental_level='tribal';
  SELECT COUNT(*) INTO or_total FROM jurisdictions WHERE state='OR';
  SELECT COUNT(*) INTO wa_total FROM jurisdictions WHERE state='WA';
  SELECT COUNT(*) INTO nv_total FROM jurisdictions WHERE state='NV';
  SELECT COUNT(*) INTO grand_total FROM jurisdictions;

  IF ca_total != 62 THEN
    RAISE EXCEPTION 'CA total wrong: expected 62, got %', ca_total;
  END IF;
  IF ca_tribal != 0 THEN
    RAISE EXCEPTION 'CA tribal wrong: expected 0, got %', ca_tribal;
  END IF;
  IF az_total != 24 THEN
    RAISE EXCEPTION 'AZ total wrong: expected 24, got %', az_total;
  END IF;
  IF az_tribal != 9 THEN
    RAISE EXCEPTION 'AZ tribal wrong: expected 9, got %', az_tribal;
  END IF;
  IF or_total != 36 THEN
    RAISE EXCEPTION 'OR total wrong: expected 36, got %', or_total;
  END IF;
  IF wa_total != 39 THEN
    RAISE EXCEPTION 'WA total wrong: expected 39, got %', wa_total;
  END IF;
  IF nv_total != 17 THEN
    RAISE EXCEPTION 'NV total wrong: expected 17, got %', nv_total;
  END IF;
  IF grand_total != 178 THEN
    RAISE EXCEPTION 'Grand total wrong: expected 178, got %', grand_total;
  END IF;
END $verify$;

COMMIT;
