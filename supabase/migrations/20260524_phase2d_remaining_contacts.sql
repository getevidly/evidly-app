-- Phase 2d: Firecrawl contact backfill — 13 accepted fills across 8 jurisdictions
-- Sources: docs/phase2d_diff.md (reviewed), docs/phase2d_results.json (raw)
-- Rule: never overwrite non-NULL fields, never touch phone columns

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- EHD FILLS (4 fields, 3 jurisdictions)
-- ═══════════════════════════════════════════════════════════

-- amador-ca: agency_email (HIGH)
UPDATE jurisdictions
SET agency_email           = 'ACEH@amadorcounty.gov',
    contact_data_source    = 'firecrawl_pending_review',
    contact_last_verified  = now(),
    contact_verified_by    = 'firecrawl-phase2d-bot'
WHERE slug = 'amador-ca'
  AND agency_email IS NULL;

-- mendocino-ca: agency_address (HIGH)
UPDATE jurisdictions
SET agency_address          = '860 N. Bush Street, Ukiah, CA 95482',
    contact_data_source     = 'firecrawl_pending_review',
    contact_last_verified   = now(),
    contact_verified_by     = 'firecrawl-phase2d-bot'
WHERE slug = 'mendocino-ca'
  AND agency_address IS NULL;

-- san-bernardino-ca: poc_name (MEDIUM), poc_title (MEDIUM)
UPDATE jurisdictions
SET poc_name                = 'Kristian Alfelor',
    poc_title               = 'Chief of Environmental Health',
    contact_data_source     = 'firecrawl_pending_review',
    contact_last_verified   = now(),
    contact_verified_by     = 'firecrawl-phase2d-bot'
WHERE slug = 'san-bernardino-ca'
  AND poc_name IS NULL;

-- ═══════════════════════════════════════════════════════════
-- FIRE AHJ FILLS (10 fields, 6 jurisdictions)
-- ═══════════════════════════════════════════════════════════

-- la-county-ca: fire_ahj_address (HIGH), fire_ahj_poc_name (MEDIUM)
UPDATE jurisdictions
SET fire_ahj_address          = '1 Industry Hills Parkway, Industry, CA 91744',
    fire_ahj_poc_name         = 'Alvin L. Brewer',
    fire_ahj_data_source      = 'firecrawl_pending_review',
    fire_ahj_last_verified    = now(),
    fire_ahj_verified_by      = 'firecrawl-phase2d-bot'
WHERE slug = 'la-county-ca'
  AND fire_ahj_address IS NULL;

-- orange-ca: fire_ahj_address (HIGH), fire_ahj_poc_name (MEDIUM)
UPDATE jurisdictions
SET fire_ahj_address          = '1 Fire Authority Road, Irvine, CA 92602',
    fire_ahj_poc_name         = 'Craig Covey',
    fire_ahj_data_source      = 'firecrawl_pending_review',
    fire_ahj_last_verified    = now(),
    fire_ahj_verified_by      = 'firecrawl-phase2d-bot'
WHERE slug = 'orange-ca'
  AND fire_ahj_address IS NULL;

-- san-benito-ca: fire_ahj_address (HIGH)
UPDATE jurisdictions
SET fire_ahj_address          = '481 Fourth Street, 1st Floor, Hollister, CA 95023',
    fire_ahj_data_source      = 'firecrawl_pending_review',
    fire_ahj_last_verified    = now(),
    fire_ahj_verified_by      = 'firecrawl-phase2d-bot'
WHERE slug = 'san-benito-ca'
  AND fire_ahj_address IS NULL;

-- san-bernardino-ca: fire_ahj_poc_name (MEDIUM)
-- fire_ahj_email DROPPED: only personal staff emails found (Smillerick, cprater) — no generic address
UPDATE jurisdictions
SET fire_ahj_poc_name         = 'Dan Munsey',
    fire_ahj_data_source      = 'firecrawl_pending_review',
    fire_ahj_last_verified    = now(),
    fire_ahj_verified_by      = 'firecrawl-phase2d-bot'
WHERE slug = 'san-bernardino-ca'
  AND fire_ahj_poc_name IS NULL;

-- santa-clara-ca: fire_ahj_email (HIGH), fire_ahj_poc_name (MEDIUM)
UPDATE jurisdictions
SET fire_ahj_email            = 'publicinfo@sccfd.org',
    fire_ahj_poc_name         = 'Geo Blackshire',
    fire_ahj_data_source      = 'firecrawl_pending_review',
    fire_ahj_last_verified    = now(),
    fire_ahj_verified_by      = 'firecrawl-phase2d-bot'
WHERE slug = 'santa-clara-ca'
  AND fire_ahj_email IS NULL;

-- solano-ca: fire_ahj_address (HIGH)
UPDATE jurisdictions
SET fire_ahj_address          = '1200 Kentucky Street, Fairfield, CA 94533',
    fire_ahj_data_source      = 'firecrawl_pending_review',
    fire_ahj_last_verified    = now(),
    fire_ahj_verified_by      = 'firecrawl-phase2d-bot'
WHERE slug = 'solano-ca'
  AND fire_ahj_address IS NULL;

-- ═══════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  v_ehd_count  int;
  v_fire_count int;
BEGIN
  SELECT count(*) INTO v_ehd_count
    FROM jurisdictions
   WHERE contact_verified_by = 'firecrawl-phase2d-bot';

  SELECT count(*) INTO v_fire_count
    FROM jurisdictions
   WHERE fire_ahj_verified_by = 'firecrawl-phase2d-bot';

  RAISE NOTICE 'Phase 2d EHD rows touched: %', v_ehd_count;
  RAISE NOTICE 'Phase 2d Fire AHJ rows touched: %', v_fire_count;
  RAISE NOTICE 'Expected: EHD=3, Fire=6';
END $$;

-- ═══════════════════════════════════════════════════════════
-- SCHEMA MIGRATIONS RECORD
-- ═══════════════════════════════════════════════════════════

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260524_phase2d_remaining_contacts')
ON CONFLICT DO NOTHING;

COMMIT;
