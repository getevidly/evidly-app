-- ══════════════════════════════════════════════════════════════════
-- C19 Phase 2 — Firecrawl Batch 1: contact backfill for 7 jurisdictions
-- ══════════════════════════════════════════════════════════════════
-- Approved fills: 40 of 41 proposed (1 rejected: Placer fire_ahj_email)
-- Food touched: 6 rows (Pasadena, SLO, Contra Costa, Placer, Sacramento, Berkeley)
-- Fire touched: 5 rows (Monterey, SLO, Contra Costa, Placer, Sacramento)
-- Source: docs/firecrawl_batch1_results.json + docs/firecrawl_batch1_diff.md
-- Tracker: supabase_migrations.schema_migrations WHERE version = '20260522230000'

BEGIN;

-- ── 1. Pasadena (food only) ────────────────────────────────────
-- 4 fills: poc_name, poc_title, agency_fax, agency_address
UPDATE jurisdictions SET
  poc_name       = 'Manuel Carmona, MPH, MPA',
  poc_title      = 'Director of Public Health',
  agency_fax     = '(626) 744-6113',
  agency_address = '1845 N. Fair Oaks Ave., Suite 1200, Pasadena, CA 91103',
  contact_data_source  = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2-bot'
WHERE id = '0e0e3fc8-5fdd-41aa-a14b-4a887d819e2f';

-- ── 2. Monterey (fire only) ───────────────────────────────────
-- 4 fills: fire_ahj_poc_name, fire_ahj_poc_title, fire_ahj_email, fire_ahj_address
UPDATE jurisdictions SET
  fire_ahj_poc_name  = 'Justin Reyes',
  fire_ahj_poc_title = 'Division Chief / Fire Marshal',
  fire_ahj_email     = 'jreyes@mcrfd.org',
  fire_ahj_address   = '19900 Portola Drive, Salinas, CA 93908',
  fire_ahj_data_source  = 'firecrawl_pending_review',
  fire_ahj_last_verified = now(),
  fire_ahj_verified_by   = 'firecrawl-phase2-bot'
WHERE id = 'fdf06087-a578-42eb-b0fb-8a8750c12348';

-- ── 3. San Luis Obispo (food + fire + website backfill) ───────
-- 6 fills: agency_website, poc_name, poc_title, agency_address,
--          fire_ahj_email, fire_ahj_address
UPDATE jurisdictions SET
  agency_website = 'https://www.slocounty.ca.gov/Departments/Health-Agency/Public-Health/Environmental-Health',
  poc_name       = 'Peter Hague',
  poc_title      = 'Director of Environmental Health',
  agency_address = '1055 Monterey Street, San Luis Obispo, CA 93408',
  contact_data_source  = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2-bot',
  fire_ahj_email   = 'slu.reception@fire.ca.gov',
  fire_ahj_address = '100 Cross Street, San Luis Obispo, CA 93401',
  fire_ahj_data_source  = 'firecrawl_pending_review',
  fire_ahj_last_verified = now(),
  fire_ahj_verified_by   = 'firecrawl-phase2-bot'
WHERE id = '00f803d1-7d50-4671-98d4-55be41c1bb40';

-- ── 4. Contra Costa (food + fire) ─────────────────────────────
-- 9 fills: poc_name, poc_title, agency_fax, agency_address,
--          fire_ahj_poc_name, fire_ahj_poc_title, fire_ahj_email,
--          fire_ahj_fax, fire_ahj_address
UPDATE jurisdictions SET
  poc_name       = 'Kristian Lucas, REHS',
  poc_title      = 'Director of Environmental Health',
  agency_fax     = '(925) 608-5502',
  agency_address = '2120 Diamond Boulevard, Suite 100, Concord, CA 94520',
  contact_data_source  = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2-bot',
  fire_ahj_poc_name  = 'Aaron McAlister',
  fire_ahj_poc_title = 'Fire Chief',
  fire_ahj_email     = 'info@cccfpd.org',
  fire_ahj_fax       = '(925) 941-3309',
  fire_ahj_address   = '4005 Port Chicago Highway, Suite 250, Concord, CA 94520-1180',
  fire_ahj_data_source  = 'firecrawl_pending_review',
  fire_ahj_last_verified = now(),
  fire_ahj_verified_by   = 'firecrawl-phase2-bot'
WHERE id = '85db5307-9608-46e2-bcf5-47131bd86119';

-- ── 5. Placer (food + fire + website backfill) ────────────────
-- 7 fills: agency_website, agency_email, agency_address,
--          fire_ahj_poc_name, fire_ahj_poc_title, fire_ahj_fax, fire_ahj_address
-- REJECTED: fire_ahj_email = 'building@placer.ca.gov' (shared building inbox)
UPDATE jurisdictions SET
  agency_website = 'https://www.placer.ca.gov/3105/Environmental-Health',
  agency_email   = 'environmentalhealth@placer.ca.gov',
  agency_address = '11434 B Ave, Suite 400, Auburn, CA 95603',
  contact_data_source  = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2-bot',
  fire_ahj_poc_name  = 'Chris Mertens',
  fire_ahj_poc_title = 'Battalion Chief / Placer County Fire Marshal',
  fire_ahj_fax       = '(530) 745-3058',
  fire_ahj_address   = '3091 County Center Dr., #160, Auburn, CA 95603',
  fire_ahj_data_source  = 'firecrawl_pending_review',
  fire_ahj_last_verified = now(),
  fire_ahj_verified_by   = 'firecrawl-phase2-bot'
WHERE id = '49fa961e-9076-4a79-b56e-b3b72b252a41';

-- ── 6. Sacramento (food + fire) ───────────────────────────────
-- 9 fills: poc_name, poc_title, agency_email, agency_fax, agency_address,
--          fire_ahj_poc_name, fire_ahj_poc_title, fire_ahj_fax, fire_ahj_address
UPDATE jurisdictions SET
  poc_name       = 'Jennea Monasterio',
  poc_title      = 'Director, Environmental Management Department',
  agency_email   = 'EMDinfo@Saccounty.gov',
  agency_fax     = '(916) 875-8513',
  agency_address = '11080 White Rock Rd., Suite 200, Rancho Cordova, CA 95670',
  contact_data_source  = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2-bot',
  fire_ahj_poc_name  = 'Adam A. House',
  fire_ahj_poc_title = 'Fire Chief',
  fire_ahj_fax       = '(916) 859-3702',
  fire_ahj_address   = '10545 Armstrong Ave., Suite 200, Mather, CA 95655',
  fire_ahj_data_source  = 'firecrawl_pending_review',
  fire_ahj_last_verified = now(),
  fire_ahj_verified_by   = 'firecrawl-phase2-bot'
WHERE id = '61c0e8aa-c729-4dbd-b92d-72a708c0d543';

-- ── 7. Berkeley (food only) ───────────────────────────────────
-- 1 fill: agency_fax
UPDATE jurisdictions SET
  agency_fax     = '(510) 981-5305',
  contact_data_source  = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2-bot'
WHERE id = 'bd7bbcbf-0658-4908-9aa9-7cada20a5ec2';

-- ── Verification block ────────────────────────────────────────
DO $$
DECLARE
  v_food integer;
  v_fire integer;
BEGIN
  SELECT count(*) INTO v_food FROM jurisdictions
  WHERE contact_verified_by = 'firecrawl-phase2-bot'
    AND contact_last_verified > now() - interval '5 minutes';

  SELECT count(*) INTO v_fire FROM jurisdictions
  WHERE fire_ahj_verified_by = 'firecrawl-phase2-bot'
    AND fire_ahj_last_verified > now() - interval '5 minutes';

  -- Expected: food=6 (Pasadena, SLO, Contra Costa, Placer, Sacramento, Berkeley)
  -- Expected: fire=5 (Monterey, SLO, Contra Costa, Placer, Sacramento)
  IF v_food != 6 OR v_fire != 5 THEN
    RAISE EXCEPTION 'Batch 1 verification FAILED: food=%, fire=% (expected 6, 5)', v_food, v_fire;
  END IF;

  RAISE NOTICE 'Batch 1 verification PASSED: food=%, fire=%', v_food, v_fire;
END $$;

COMMIT;

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260522230000')
ON CONFLICT DO NOTHING;
