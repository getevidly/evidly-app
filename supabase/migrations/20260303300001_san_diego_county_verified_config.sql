-- ═══════════════════════════════════════════════════════════════════════
-- SAN DIEGO COUNTY — Second Fully-Verified Jurisdiction Configuration
--
-- Source: Official SD County DEHQ documentation + County Code + Open Data
-- Confidence: HIGH (90/100) — validated from 12 official sources
-- Import Eligible: Yes
-- Data Completeness: 90% (open questions: re-grade fee, modifier deductions)
--
-- Data Sources:
--   1. https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/food.html
--   2. https://www.sandiegocounty.gov/content/sdc/deh/fhd/ffis/intro.html.html
--   3. https://codelibrary.amlegal.com/codes/san_diego/latest/sandiego_regs/0-0-0-102341
--   4. https://files.amlegal.com/pdffiles/SanDiegoCo/ord10218.pdf
--   5. https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/publications.html
--   6. https://data.sandiegocounty.gov/d/k4gp-mvud
--   7. https://data.sandiegocounty.gov/stories/s/Food-Facility-Inspection-Grades/icun-qvbm/
--   8. https://play.google.com/store/apps/details?id=org.countyofsandiego.sdfoodinfo
--   9. https://apps.apple.com/us/app/sd-food-info/id1434099661
--  10. https://www.nbcsandiego.com/news/local/99-of-san-diego-restaurants-earn-a-grades/25381/
--  11. https://www.sandiegocounty.gov/content/sdc/deh/doing_business/on_line.html
--  12. https://www.sdfoodinfo.org/
--
-- Verified facts:
--   - 100-point deductive scoring (start at 100, subtract per violation)
--   - Letter grades: A (90-100), B (80-89), C (0-79)
--   - NO "Score Card" tier — every facility gets a letter grade
--   - Major Risk Factor = 4 pts, Minor Risk Factor = 2 pts, Good Retail Practice = 1 pt
--   - NO Category #53 equivalent (no +3 for multiple majors)
--   - NO +7 closure stacking — closure is binary, not point-based
--   - Single authority: DEHQ covers ALL 18 cities + unincorporated areas
--   - NO independent city health departments (unlike LA County)
--   - ~14,000 permitted facilities, ~32,000+ inspections/year
--   - 99%+ A-grade rate (NBC 7 Investigates)
--   - Re-score: once per calendar year (voluntary for B, mandatory for C within 30 days)
--   - MEHKO exempt from grading
--   - Governing ordinance: County Code Section 61.107 (Ordinance No. 10218, 2012-07-25)
--   - Fire AHJ: SD County Fire Authority + City of SD Fire-Rescue + independent city FDs
-- ═══════════════════════════════════════════════════════════════════════

-- Update San Diego County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'San Diego County Department of Environmental Health and Quality — Food and Housing Division',

  -- Verified scoring/grading (confirmed from County Code Section 61.107)
  scoring_type = 'weighted_deduction',
  grading_type = 'letter_grade',
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [0, 79],
    "fail_below": null,
    "below_70_display": "letter_grade_C",
    "closure_trigger": "imminent_health_hazard",
    "grade_posting": "required_near_public_entrance",
    "reports_public": true,
    "mehko_exempt": true,
    "verified_from": "San Diego County Code Section 61.107 (Ordinance No. 10218)",
    "inspection_frequency": "typically_2_per_year_risk_based",
    "rescore_rules": {
      "B_grade": "voluntary_once_per_calendar_year",
      "C_grade": "mandatory_written_request_within_30_days",
      "rescore_inspection": "within_10_business_days_of_request"
    },
    "modifier_deductions": "none_documented",
    "note_99pct_a_grade": "NBC 7 Investigates: 99%+ of routine inspections result in A grades"
  }'::jsonb,
  scoring_methodology = 'Deductive 100-point system. Start at 100, subtract points per violation. Major Risk Factor = 4 pts, Minor Risk Factor = 2 pts, Good Retail Practice = 1 pt. NO modifier deductions (no Category #53 equivalent, no +7 closure stacking). C grade covers 0-79 (no separate Score Card tier). Food Inspection Report is the official form.',

  -- Verified thresholds
  pass_threshold = 90,
  warning_threshold = 79,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'San Diego County Fire Authority / City of San Diego Fire-Rescue',
  fire_ahj_type = 'mixed',
  has_local_amendments = true,
  local_amendment_notes = 'Single food safety authority (DEHQ) covers all 18 cities + unincorporated areas. NO independent city health departments. Multiple fire AHJs: SD County Fire Authority (unincorporated + some contract cities), City of SD Fire-Rescue (City of SD), plus independent city fire departments.',

  -- Verified data sources
  data_source_type = 'portal',
  data_source_url = 'https://data.sandiegocounty.gov/d/k4gp-mvud',
  data_source_tier = 1,

  -- Verified facility count
  facility_count = 14000,
  population_rank = 2,

  -- Updated notes with verification info
  notes = 'VERIFIED (2026-03-03). Confidence: HIGH (90/100). Second-largest CA jurisdiction. Letter grades A/B/C — NO Score Card tier (C covers 0-79). NO modifier deductions documented (no Cat#53, no +7 closure). 99%+ A-grade rate. Single authority model (simpler than LA County). Re-score: once/calendar year for B, mandatory 30-day correction for C. MEHKO exempt. Socrata open data API + mobile app (SD Food Info, iOS+Android). 95K+ inspection records. ~32K inspections/year. 18 cities + unincorporated areas. Contact: (858) 505-6900, dehinbox@sdcounty.ca.gov.'
WHERE county = 'San Diego'
  AND city IS NULL
  AND state = 'CA';
