-- ══════════════════════════════════════════════════════════════════
-- C19 Phase 2c RERUN — Corrected slugs (all CA jurisdictions use -ca suffix)
-- ══════════════════════════════════════════════════════════════════
-- Original run: 20260522_phase2c_bulk_contact_backfill.sql
-- Problem: 18 of 19 UPDATEs used bare slugs (no -ca suffix) → 0 rows matched
-- Fix: All slugs now use <name>-ca convention matching PROD
-- EXCLUDED: Nevada (slug=nevada-ca) — already landed in original run
-- Expected: 18 food rows updated, 0 fire rows
-- Tracker: supabase_migrations.schema_migrations WHERE version = '20260522_phase2c_rerun'
--
-- Uses contact_verified_by = 'firecrawl-phase2c-bot' (same tag as original).
-- Verification uses RAISE EXCEPTION on mismatch (hard fail).

BEGIN;

-- ── 1. Humboldt ─────────────────────────────────────────────────
-- 2 fills: agency_fax, agency_email
-- Source: https://humboldtgov.org/564/Environmental-Health
UPDATE jurisdictions SET
  agency_fax     = '(707) 441-5699',
  agency_email   = 'ENVHEALTH@co.humboldt.ca.us',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'humboldt-ca';

-- ── 2. Del Norte ────────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — CDD Director, not EH-specific)
-- Source: https://www.co.del-norte.ca.us/departments/EnvironmentalHealth
UPDATE jurisdictions SET
  poc_name  = 'Heidi Kunstal',
  poc_title = 'Community Development Department Director',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'del-norte-ca';

-- ── 3. Fresno ───────────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — DPH Director, not EH-specific)
-- Source: fresnocountyca.gov org chart PDF
UPDATE jurisdictions SET
  poc_name  = 'Joe Prado',
  poc_title = 'Director of Public Health',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'fresno-ca';

-- ── 4. San Diego ────────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (HIGH — official leadership page)
-- Source: https://www.sandiegocounty.gov/content/sdc/deh/about/leadership.html
UPDATE jurisdictions SET
  poc_name  = 'Elizabeth A. Pozzebon',
  poc_title = 'Director of Environmental Health and Quality',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'san-diego-ca';

-- ── 5. San Francisco ────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — staff directory)
-- Source: https://www.sf.gov/reports--january-2025--environmental-health-branch-staff-directory
UPDATE jurisdictions SET
  poc_name  = 'Jennifer Callewaert',
  poc_title = 'Acting Director of Environmental Health',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'san-francisco-ca';

-- ── 6. Riverside ────────────────────────────────────────────────
-- 1 fill: agency_fax (HIGH — official contact page)
-- Source: https://rivcoeh.org/contact-us
UPDATE jurisdictions SET
  agency_fax = '(951) 358-5017',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'riverside-ca';

-- ── 7. Santa Clara ──────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — management page)
-- Source: https://deh.santaclaracounty.gov/about-us/management
UPDATE jurisdictions SET
  poc_name  = 'Marilyn C. Underwood',
  poc_title = 'Director of Environmental Health',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'santa-clara-ca';

-- ── 8. San Mateo ────────────────────────────────────────────────
-- 4 fills: poc_name, poc_title, agency_email, agency_fax (HIGH+MEDIUM)
-- Source: https://www.smchealth.org/contact-info/contact-environmental-health
UPDATE jurisdictions SET
  poc_name     = 'Heather Forshey',
  poc_title    = 'Director of Environmental Health',
  agency_email = 'envhealth@smcgov.org',
  agency_fax   = '(650) 627-8244',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'san-mateo-ca';

-- ── 9. Napa ─────────────────────────────────────────────────────
-- 2 fills: agency_email, agency_fax (HIGH)
-- Source: https://www.napacounty.gov/1904/Environmental-Health-Division
UPDATE jurisdictions SET
  agency_email = 'envhealth@napacounty.gov',
  agency_fax   = '(707) 253-4545',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'napa-ca';

-- ── 10. Sonoma ──────────────────────────────────────────────────
-- 1 fill: agency_email (HIGH)
-- Source: https://sonomacounty.gov/.../environmental-health/contact-us
UPDATE jurisdictions SET
  agency_email = 'eh@sonoma-county.org',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'sonoma-ca';

-- ── 11. Solano ──────────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — LinkedIn + county directory)
-- Source: https://www.solanocounty.gov/.../environmental-health
UPDATE jurisdictions SET
  poc_name  = 'Trey Strickland',
  poc_title = 'Environmental Health Director',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'solano-ca';

-- ── 12. Stanislaus ──────────────────────────────────────────────
-- 3 fills: poc_name, poc_title, agency_fax (HIGH fax, MEDIUM POC)
-- Source: https://www.stancounty.com/er/contacts.shtm
UPDATE jurisdictions SET
  poc_name   = 'Robert Kostlivy',
  poc_title  = 'Director of Environmental Resources',
  agency_fax = '(209) 525-6774',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'stanislaus-ca';

-- ── 13. San Joaquin ─────────────────────────────────────────────
-- 3 fills: poc_name, poc_title, agency_address (HIGH address, MEDIUM POC)
-- Source: https://sjcehd.com/contact-us/ + CEC filing
UPDATE jurisdictions SET
  poc_name       = 'Linda Turkatte',
  poc_title      = 'Director of Environmental Health',
  agency_address = '1868 E. Hazelton Ave., Stockton, CA 95205',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'san-joaquin-ca';

-- ── 14. Santa Cruz ──────────────────────────────────────────────
-- 1 fill: agency_address (HIGH)
-- Source: scceh.com/NewHome/AboutUs/ContactUs.aspx
UPDATE jurisdictions SET
  agency_address = '701 Ocean Street, 3rd Floor, Room 312, Santa Cruz, CA 95060',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'santa-cruz-ca';

-- ── 15. Yolo ────────────────────────────────────────────────────
-- 3 fills: poc_name, poc_title, agency_fax (all HIGH)
-- Source: https://www.yolocounty.gov/home/showdocument?id=62713
UPDATE jurisdictions SET
  poc_name   = 'April Meneghetti, REHS',
  poc_title  = 'Director of Environmental Health',
  agency_fax = '(530) 669-1448',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'yolo-ca';

-- ── SKIP: Nevada (slug=nevada-ca) — already landed in original run ──

-- ── 16. Mono ────────────────────────────────────────────────────
-- 2 fills: agency_fax, agency_address (HIGH)
-- Source: https://monocounty.ca.gov/environmental-health/contact/environmental-health-contact-information
UPDATE jurisdictions SET
  agency_fax     = '(760) 924-1831',
  agency_address = '1290 Tavern Road, PO Box 3329, Mammoth Lakes, CA 93546',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'mono-ca';

-- ── 17. Marin ───────────────────────────────────────────────────
-- 1 fill: agency_address (HIGH)
-- Source: https://www.marincounty.gov/departments/cda/env-health-svcs
UPDATE jurisdictions SET
  agency_address = '3501 Civic Center Drive, Suite 236, San Rafael, CA 94903',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'marin-ca';

-- ── 18. Colusa ──────────────────────────────────────────────────
-- 1 fill: agency_address (HIGH)
-- Source: https://www.countyofcolusaca.gov/425/Retail-Food-Safety
UPDATE jurisdictions SET
  agency_address = '547 Market Street, Colusa, CA 95932',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'colusa-ca';

-- ── Verification block (RAISE EXCEPTION on mismatch) ────────────
DO $$
DECLARE
  v_food integer;
BEGIN
  -- Count rows touched by this bot in the last 5 minutes.
  -- Nevada (already landed) uses same bot tag but was >5 min ago, so excluded.
  SELECT count(*) INTO v_food FROM jurisdictions
  WHERE contact_verified_by = 'firecrawl-phase2c-bot'
    AND contact_last_verified > now() - interval '5 minutes';

  IF v_food != 18 THEN
    RAISE EXCEPTION 'Phase 2c rerun FAILED: expected 18 food rows, got %. Slug mismatch or missing rows.', v_food;
  END IF;

  RAISE NOTICE 'Phase 2c rerun verification PASSED: food=% rows updated', v_food;
END $$;

COMMIT;

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260522_phase2c_rerun')
ON CONFLICT DO NOTHING;
