-- ============================================================
-- Napa County — Verified Jurisdiction Config (March 2026)
-- ============================================================
-- System: Letter grade A/B/C with points-deduction from 100
-- A = 90-100, B = 80-89, C = 70-79, Closure = below 70
-- Closure: minimum 24-hour, no grade issued
-- Rescore: operators may request 1/year (fee required)
-- Performance (April 2025): 90%+ scored A, 98%+ scored A or B
-- Only letter-grade county in Bay Area batch
-- Transparency: HIGH
-- Agency: Napa County HHS — Division of Environmental Health
-- Source: countyofnapa.org/1000/Environmental-Health — verified March 2026
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Napa County Health and Human Services — Division of Environmental Health',
  agency_phone = '(707) 253-4417',
  agency_address = '1195 Third Street, Suite 101, Napa, CA 94559',
  public_portal = 'https://www.countyofnapa.org/1000/Environmental-Health',
  regulatory_code = 'CalCode',
  scoring_type = 'letter_grade',
  grading_type = 'letter_grade',
  pass_threshold = 70,
  warning_threshold = 80,
  critical_threshold = 70,
  transparency_level = 'high',
  inspection_frequency = 'risk_based',
  facility_count = NULL,
  fire_ahj_name = 'CAL FIRE / City of Napa Fire / City of American Canyon Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  scoring_methodology = 'Letter grade A/B/C. Points deducted from 100. A=90-100, B=80-89, C=70-79. Closure=below 70 (no grade, min 24-hr). Rescore option: 1/year, fee required. April 2025: 90%+ A, 98%+ A or B. Only letter-grade county in Bay Area batch.',
  notes = 'STANDARDIZED March 2026. Letter grade (only in Bay Area batch). A=90+, B=80-89, C=70-79, Closure=<70. Napa Valley wine/culinary tourism market. Rescore option 1/year.'
WHERE county = 'Napa' AND city IS NULL;

-- Verify
SELECT county, scoring_type, grading_type, pass_threshold, warning_threshold, transparency_level
FROM jurisdictions WHERE county = 'Napa';
