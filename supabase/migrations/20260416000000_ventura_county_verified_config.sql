-- ============================================================
-- Ventura County — Verified Jurisdiction Config (March 2026)
-- ============================================================
-- System: Pass/fail inspection placard (NOT Green/Yellow/Red)
-- Placard: Dated pass card with inspector name, EHD website, EHD phone
-- Closure: Separate notice posted; listed on EHD closures page
-- Online: VC Safe Diner app (eco.vcrma.org), results updated daily
-- Transparency: MEDIUM-HIGH
-- Facilities: ~5,000+
-- Inspections: Annual minimum; additional for high-risk/complaints
-- Agency: Ventura County RMA — Environmental Health Division, Food Protection Program
-- Source: rma.venturacounty.gov, Ventura County Grand Jury 2008-09 report, VC Safe Diner
-- Verified: March 2026
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Ventura County Resource Management Agency — Environmental Health Division, Food Protection Program',
  agency_phone = '(805) 654-2813',
  agency_address = '800 S. Victoria Avenue, Ventura, CA 93009',
  public_portal = 'https://rma.venturacounty.gov/divisions/environmental-health/consumer-food-protection/',
  regulatory_code = 'CalCode',
  scoring_type = 'pass_fail_placard',
  grading_type = 'pass_fail_placard',
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,
  transparency_level = 'medium_high',
  inspection_frequency = 'annual_minimum',
  facility_count = 5000,
  fire_ahj_name = 'Ventura County Fire Department / City Fire Departments',
  fire_ahj_type = 'mixed_county_city',
  has_local_amendments = false,
  scoring_methodology = 'Pass/fail inspection placard. NOT Green/Yellow/Red color-coded. Placard = dated pass card with inspector name, EHD website, EHD phone. Separate closure notice if facility fails. No numeric score or letter grade. Online results via VC Safe Diner, updated daily. Annual inspections minimum. ~5,000 facilities.',
  notes = 'STANDARDIZED March 2026. Pass/fail placard — not GYR. MEDIUM-HIGH transparency. ~5,000 facilities. App: VC Safe Diner.'
WHERE county = 'Ventura' AND city IS NULL;

-- Verify
SELECT county, scoring_type, grading_type, pass_threshold, transparency_level
FROM jurisdictions WHERE county = 'Ventura';
