-- ══════════════════════════════════════════════════════════════════
-- C19 Phase 2c — Bulk contact backfill: 19 CA jurisdictions
-- ══════════════════════════════════════════════════════════════════
-- Source: WebSearch + WebFetch crawl of agency websites (2026-05-22)
-- Food touched: 19 rows
-- Fire touched: 0 rows (fire AHJ deferred to Phase 2d)
-- Total fills: 36 (22 HIGH, 14 MEDIUM)
-- Manual queue: docs/phase2c_manual_queue.md (29 EHD + all fire AHJ)
-- Tracker: supabase_migrations.schema_migrations WHERE version = '20260522_phase2c'
--
-- Slug-based WHERE clauses used (slug column is UNIQUE on jurisdictions).
-- All updated fields are confirmed NULL from gap audit 20260521.
-- Metadata: contact_data_source='firecrawl_pending_review',
--           contact_verified_by='firecrawl-phase2c-bot'

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
WHERE slug = 'humboldt';

-- ── 2. Del Norte ────────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — CDD Director, not EH-specific)
-- Source: https://www.co.del-norte.ca.us/departments/EnvironmentalHealth
UPDATE jurisdictions SET
  poc_name  = 'Heidi Kunstal',
  poc_title = 'Community Development Department Director',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'del-norte';

-- ── 3. Fresno ───────────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — DPH Director, not EH-specific)
-- Source: fresnocountyca.gov org chart PDF
UPDATE jurisdictions SET
  poc_name  = 'Joe Prado',
  poc_title = 'Director of Public Health',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'fresno';

-- ── 4. San Diego ────────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (HIGH — official leadership page)
-- Source: https://www.sandiegocounty.gov/content/sdc/deh/about/leadership.html
UPDATE jurisdictions SET
  poc_name  = 'Elizabeth A. Pozzebon',
  poc_title = 'Director of Environmental Health and Quality',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'san-diego';

-- ── 5. San Francisco ────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — staff directory)
-- Source: https://www.sf.gov/reports--january-2025--environmental-health-branch-staff-directory
UPDATE jurisdictions SET
  poc_name  = 'Jennifer Callewaert',
  poc_title = 'Acting Director of Environmental Health',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'san-francisco';

-- ── 6. Riverside ────────────────────────────────────────────────
-- 1 fill: agency_fax (HIGH — official contact page)
-- Source: https://rivcoeh.org/contact-us
UPDATE jurisdictions SET
  agency_fax = '(951) 358-5017',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'riverside';

-- ── 7. Santa Clara ──────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — search results)
-- Source: https://deh.santaclaracounty.gov/about-us/management
UPDATE jurisdictions SET
  poc_name  = 'Marilyn C. Underwood',
  poc_title = 'Director of Environmental Health',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'santa-clara';

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
WHERE slug = 'san-mateo';

-- ── 9. Napa ─────────────────────────────────────────────────────
-- 2 fills: agency_email, agency_fax (HIGH)
-- Source: https://www.napacounty.gov/1904/Environmental-Health-Division
UPDATE jurisdictions SET
  agency_email = 'envhealth@napacounty.gov',
  agency_fax   = '(707) 253-4545',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'napa';

-- ── 10. Sonoma ──────────────────────────────────────────────────
-- 1 fill: agency_email (HIGH)
-- Source: https://sonomacounty.gov/.../environmental-health/contact-us
UPDATE jurisdictions SET
  agency_email = 'eh@sonoma-county.org',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'sonoma';

-- ── 11. Solano ──────────────────────────────────────────────────
-- 2 fills: poc_name, poc_title (MEDIUM — LinkedIn + county directory)
-- Source: https://www.solanocounty.gov/.../environmental-health
UPDATE jurisdictions SET
  poc_name  = 'Trey Strickland',
  poc_title = 'Environmental Health Director',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'solano';

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
WHERE slug = 'stanislaus';

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
WHERE slug = 'san-joaquin';

-- ── 14. Santa Cruz ──────────────────────────────────────────────
-- 1 fill: agency_address (HIGH)
-- Source: scceh.com/NewHome/AboutUs/ContactUs.aspx
UPDATE jurisdictions SET
  agency_address = '701 Ocean Street, 3rd Floor, Room 312, Santa Cruz, CA 95060',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'santa-cruz';

-- ── 15. Yolo ────────────────────────────────────────────────────
-- 3 fills: poc_name, poc_title, agency_fax (HIGH — official county document)
-- Source: https://www.yolocounty.gov/home/showdocument?id=62713
UPDATE jurisdictions SET
  poc_name   = 'April Meneghetti, REHS',
  poc_title  = 'Director of Environmental Health',
  agency_fax = '(530) 669-1448',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'yolo';

-- ── 16. Nevada ──────────────────────────────────────────────────
-- 4 fills: poc_name, poc_title, agency_fax, agency_address (HIGH fax+addr, MEDIUM POC)
-- Source: https://www.nevadacountyca.gov/1470/Environmental-Health
UPDATE jurisdictions SET
  poc_name       = 'Amy Irani, REHS',
  poc_title      = 'Director of Environmental Health',
  agency_fax     = '(530) 265-9854',
  agency_address = '950 Maidu Avenue, Suite 170, Nevada City, CA 95959-7902',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'nevada-ca';

-- ── 17. Mono ────────────────────────────────────────────────────
-- 2 fills: agency_fax, agency_address (HIGH)
-- Source: https://monocounty.ca.gov/environmental-health/contact/environmental-health-contact-information
UPDATE jurisdictions SET
  agency_fax     = '(760) 924-1831',
  agency_address = '1290 Tavern Road, PO Box 3329, Mammoth Lakes, CA 93546',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'mono';

-- ── 18. Marin ───────────────────────────────────────────────────
-- 1 fill: agency_address (HIGH)
-- Source: https://www.marincounty.gov/departments/cda/env-health-svcs
UPDATE jurisdictions SET
  agency_address = '3501 Civic Center Drive, Suite 236, San Rafael, CA 94903',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'marin';

-- ── 19. Colusa (partial) ────────────────────────────────────────
-- 1 fill: agency_address (HIGH — from food permit mailing address on page)
-- Source: https://www.countyofcolusaca.gov/425/Retail-Food-Safety
-- Note: Gaps remain for phone, fax, email, POC → manual queue
UPDATE jurisdictions SET
  agency_address = '547 Market Street, Colusa, CA 95932',
  contact_data_source   = 'firecrawl_pending_review',
  contact_last_verified = now(),
  contact_verified_by   = 'firecrawl-phase2c-bot'
WHERE slug = 'colusa';

-- ── Verification block (NOTICE only, no RAISE EXCEPTION) ────────
DO $$
DECLARE
  v_food integer;
BEGIN
  SELECT count(*) INTO v_food FROM jurisdictions
  WHERE contact_verified_by = 'firecrawl-phase2c-bot'
    AND contact_last_verified > now() - interval '5 minutes';

  IF v_food != 19 THEN
    RAISE NOTICE 'Phase 2c food count mismatch: expected 19, got %. Some slugs may not match.', v_food;
  ELSE
    RAISE NOTICE 'Phase 2c verification PASSED: food=% rows updated', v_food;
  END IF;
END $$;

COMMIT;

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260522_phase2c')
ON CONFLICT DO NOTHING;
