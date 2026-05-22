-- ══════════════════════════════════════════════════════════════════
-- C19 Phase 2b — Manual contact backfill for 3 jurisdictions
-- ══════════════════════════════════════════════════════════════════
-- Approved fills: 27 of 28 proposed (1 dropped: Ventura fire_ahj_fax — stale Camarillo HQ)
-- Food touched: 3 rows (Santa Barbara, Ventura, Vernon)
-- Fire touched: 3 rows (Santa Barbara, Ventura, Vernon)
-- Vernon: fire AHJ changed from Vernon FD (disbanded 2020-10-21) to LACoFD
-- Source: docs/phase2b_diff.md (v2, corrected 2026-05-22)
-- Tracker: supabase_migrations.schema_migrations WHERE version = '20260522_phase2b_contact_backfill'

BEGIN;

-- ── 1. Santa Barbara (food + fire) ──────────────────────────────
-- 11 fills: agency_website, agency_email, agency_fax, agency_address,
--           poc_name, poc_title,
--           fire_ahj_website, fire_ahj_poc_name, fire_ahj_poc_title,
--           fire_ahj_fax, fire_ahj_address
UPDATE jurisdictions SET
  agency_website = 'https://www.countyofsb.org/2198/Environmental-Health-Division',
  agency_email   = 'phdehsweb@sbcphd.org',
  agency_fax     = '(805) 681-4901',
  agency_address = '225 Camino del Remedio, Santa Barbara, CA 93110',
  poc_name       = 'Lars Seifert',
  poc_title      = 'Director, Environmental Health Services',
  contact_data_source   = 'manual_phase2b',
  contact_last_verified = now(),
  contact_verified_by   = 'manual-phase2b-arthur',
  fire_ahj_website   = 'https://sbcfire.com/',
  fire_ahj_poc_name  = 'Garrett Huff',
  fire_ahj_poc_title = 'Fire Chief',
  fire_ahj_fax       = '(805) 681-5563',
  fire_ahj_address   = '4410 Cathedral Oaks Road, Santa Barbara, CA 93110',
  fire_ahj_data_source   = 'manual_phase2b',
  fire_ahj_last_verified = now(),
  fire_ahj_verified_by   = 'manual-phase2b-arthur'
WHERE id = 'feae8f1d-517f-4b8e-a521-bbb115ba7b0e';

-- ── 2. Ventura (food + fire) ────────────────────────────────────
-- 8 fills: agency_website, agency_fax, agency_email, agency_address,
--          fire_ahj_website, fire_ahj_poc_name, fire_ahj_poc_title,
--          fire_ahj_address
-- DROPPED: fire_ahj_fax — stale Camarillo HQ number, new Thousand Oaks HQ lists no fax
UPDATE jurisdictions SET
  agency_website = 'https://rma.venturacounty.gov/divisions/environmental-health/',
  agency_fax     = '(805) 654-2480',
  agency_email   = 'EHDmessages@ventura.org',
  agency_address = '800 S. Victoria Ave., #1730, Ventura, CA 93009',
  contact_data_source   = 'manual_phase2b',
  contact_last_verified = now(),
  contact_verified_by   = 'manual-phase2b-arthur',
  fire_ahj_website   = 'https://fire.venturacounty.gov/',
  fire_ahj_poc_name  = 'Dustin Gardner',
  fire_ahj_poc_title = 'Fire Chief',
  fire_ahj_address   = '2400 Conejo Spectrum Street, Thousand Oaks, CA 91320',
  fire_ahj_data_source   = 'manual_phase2b',
  fire_ahj_last_verified = now(),
  fire_ahj_verified_by   = 'manual-phase2b-arthur'
WHERE id = '43ec04a6-eb8e-4c36-b4f9-d9e560232dad';

-- ── 3. Vernon (food + fire jurisdiction change) ─────────────────
-- Food: 4 fills — agency_website (REPLACE), poc_name, poc_title, agency_address
-- Fire: 4 fills — fire_ahj_website, fire_ahj_poc_name, fire_ahj_poc_title, fire_ahj_address
-- NOTE: Vernon FD disbanded 2020-10-21; fire AHJ = LA County Fire Department
-- NOTE: agency_website is a REPLACE (old: cityofvernon.org, new: cityofvernonca.gov)
-- NOTE: all fire_ahj_* currently NULL per audit — no stale data to clear
UPDATE jurisdictions SET
  agency_website = 'https://www.cityofvernonca.gov/government/health',
  poc_name       = 'Freddie Agyin',
  poc_title      = 'Director',
  agency_address = '4305 S. Santa Fe Ave., Vernon, CA 90058',
  contact_data_source   = 'manual_phase2b',
  contact_last_verified = now(),
  contact_verified_by   = 'manual-phase2b-arthur',
  fire_ahj_website   = 'https://fire.lacounty.gov/',
  fire_ahj_poc_name  = 'Anthony C. Marrone',
  fire_ahj_poc_title = 'Fire Chief',
  fire_ahj_address   = '1320 N. Eastern Ave., Los Angeles, CA 90063',
  fire_ahj_data_source   = 'manual_jurisdiction_change_2020',
  fire_ahj_last_verified = now(),
  fire_ahj_verified_by   = 'manual-phase2b-arthur'
WHERE id = '7edbb389-6fa8-4421-bed3-f6d64312fb08';

-- ── Verification block ──────────────────────────────────────────
DO $$
DECLARE
  v_food integer;
  v_fire integer;
BEGIN
  SELECT count(*) INTO v_food FROM jurisdictions
  WHERE contact_verified_by = 'manual-phase2b-arthur'
    AND contact_last_verified > now() - interval '5 minutes';

  SELECT count(*) INTO v_fire FROM jurisdictions
  WHERE fire_ahj_verified_by = 'manual-phase2b-arthur'
    AND fire_ahj_last_verified > now() - interval '5 minutes';

  -- Expected: food=3 (Santa Barbara, Ventura, Vernon)
  -- Expected: fire=3 (Santa Barbara, Ventura, Vernon)
  IF v_food != 3 OR v_fire != 3 THEN
    RAISE EXCEPTION 'Phase 2b verification FAILED: food=%, fire=% (expected 3, 3)', v_food, v_fire;
  END IF;

  RAISE NOTICE 'Phase 2b verification PASSED: food=%, fire=%', v_food, v_fire;
END $$;

COMMIT;

-- ── Migration tracker ───────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260522_phase2b_contact_backfill')
ON CONFLICT DO NOTHING;
