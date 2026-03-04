-- ============================================================
-- LONG BEACH (INDEPENDENT CITY) — Food Safety Jurisdiction Standardization
--
-- Agency: City of Long Beach — Bureau of Environmental Health
-- Address: 2525 Grand Avenue, Room 220, Long Beach, CA 90815
-- Phone: (562) 570-4132 | Email: environmentalhealth@longbeach.gov
-- Regulatory basis: CalCode + local amendments
-- Verified: March 2026
--
-- KEY FACTS:
--   INDEPENDENT CITY — LA County EHD has NO jurisdiction here
--   LA County health permits NOT valid within Long Beach city limits
--   LETTER GRADE A/B/C + Score Card below 70
--   A=90-100 | B=80-89 | C=70-79 | Score Card=<70
--   ~3,000–4,000 facilities
--   Transparency: HIGH
--   Risk-based: high=2x/yr, medium=1x/yr, low=18-month cycle
--   Port of Long Beach; CSULB campus dining; Convention Center events
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'City of Long Beach — Bureau of Environmental Health',

  scoring_type = 'letter_grade',
  grading_type = 'letter_grade',
  grading_config = '{
    "display_format": "letter_grade",
    "jurisdiction_type": "independent_city",
    "independent_from_county": true,
    "county_permits_invalid": true,
    "grades": {
      "A": { "min": 90, "max": 100, "label": "A", "color": "green",  "passing": true },
      "B": { "min": 80, "max": 89,  "label": "B", "color": "yellow", "passing": true },
      "C": { "min": 70, "max": 79,  "label": "C", "color": "orange", "passing": false },
      "score_card": { "min": 0, "max": 69, "label": "Score Card", "color": "red", "passing": false, "note": "Numeric score posted instead of letter grade" }
    },
    "numeric_score": true,
    "score_start": 100,
    "placard_required": true,
    "placard_posted": true,
    "placard_label": "Grade Card",
    "report_online": true,
    "report_at_facility": true,
    "report_at_office": true,
    "transparency_level": "high",
    "violation_categories": ["major", "minor", "good_retail_practices"],
    "inspection_frequency": "risk_based",
    "inspection_frequency_detail": { "high_risk": "2x per year", "medium_risk": "1x per year", "low_risk": "18-month cycle" },
    "county_context": "Independent city (~3,000–4,000 facilities). INDEPENDENT from LA County EHD — separate jurisdiction, separate permits. Port of Long Beach; CSULB campus dining; Long Beach Convention Center events. Dog-friendly patio dining policy (July 2012). Coastal resort waterfront.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Letter Grade A/B/C + Score Card below 70. INDEPENDENT CITY — separate from LA County EHD. A=90-100, B=80-89, C=70-79, Score Card=<70. Risk-based frequency: high=2x/yr, medium=1x/yr, low=18mo.',

  pass_threshold = 90,
  warning_threshold = 80,
  critical_threshold = 70,

  fire_ahj_name = 'City of Long Beach Fire Department',
  fire_ahj_type = 'city_fire',
  has_local_amendments = true,
  local_amendment_notes = 'Independent city health dept. LA County EHD permits NOT valid within Long Beach. Score Card posted for scores below 70 (numeric score instead of letter grade). Dog-friendly patio policy (July 2012).',

  data_source_type = 'portal',
  data_source_url = 'https://www.longbeach.gov/health/inspections-and-reporting/inspections/environmental-health-bureau/food-safety-program/',
  data_source_tier = 1,
  facility_count = 3500,
  population_rank = 7,

  notes = 'STANDARDIZED March 2026. LETTER GRADE A/B/C + Score Card. HIGH transparency. INDEPENDENT CITY — NOT under LA County EHD. Separate data source from LA County. Port of Long Beach, CSULB, Convention Center.'

WHERE county = 'Los Angeles' AND city = 'Long Beach' AND state = 'CA';
