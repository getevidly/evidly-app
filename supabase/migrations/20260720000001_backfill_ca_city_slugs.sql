-- Migration: Backfill CA city slugs on production
-- Context: Production had NULL slugs on 4 CA independent cities (Berkeley, Long Beach, Pasadena, Vernon).
-- Staging had correct slugs; this migration brings prod into parity.
-- Without slugs, ScoreTable pages for these 4 cities return 404.

BEGIN;

-- Backfill slugs by ID (matches both staging and prod — verified by diagnostic query)
UPDATE jurisdictions
  SET slug = 'berkeley'
  WHERE id = 'd216b118-6d9f-46af-8885-98d32953cd66'
    AND slug IS NULL;

UPDATE jurisdictions
  SET slug = 'long-beach'
  WHERE id = '98802c57-2c6e-4313-bb14-72e9551f238e'
    AND slug IS NULL;

UPDATE jurisdictions
  SET slug = 'pasadena'
  WHERE id = 'ff632a14-a8c5-4f6e-9b6f-853c6dafee66'
    AND slug IS NULL;

UPDATE jurisdictions
  SET slug = 'vernon'
  WHERE id = '137d5a6c-24fb-4470-9481-2c064dcff3e8'
    AND slug IS NULL;

-- Verification — every CA city must now have a slug
DO $verify$
DECLARE
  missing_slugs INT;
  ca_city_total INT;
BEGIN
  SELECT COUNT(*) INTO missing_slugs
    FROM jurisdictions
    WHERE state='CA' AND governmental_level='city' AND slug IS NULL;

  SELECT COUNT(*) INTO ca_city_total
    FROM jurisdictions
    WHERE state='CA' AND governmental_level='city';

  IF missing_slugs != 0 THEN
    RAISE EXCEPTION 'CA cities still missing slugs: % rows', missing_slugs;
  END IF;

  IF ca_city_total != 4 THEN
    RAISE EXCEPTION 'CA city total wrong: expected 4, got %', ca_city_total;
  END IF;
END $verify$;

COMMIT;
