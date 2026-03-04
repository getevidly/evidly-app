-- ============================================================
-- PASADENA (INDEPENDENT CITY) — Food Safety Jurisdiction Standardization
--
-- Agency: City of Pasadena Public Health Department
--         — Environmental Health Division
-- Address: 1845 N. Fair Oaks Avenue, Pasadena, CA 91103
-- Phone: (626) 744-6004
-- Inspection Search: decadeonline.com/main.phtml?agency=pas
-- Legal basis: Pasadena Municipal Code Chapter 8.13 (effective July 1, 2014)
-- Regulatory basis: CalCode + Pasadena Municipal Code Ch. 8.13
-- Verified: March 2026
--
-- KEY FACTS:
--   INDEPENDENT CITY — LA County EHD has NO jurisdiction
--   LA County permits NOT valid within Pasadena city limits
--   *** CRITICAL: PASS / CONDITIONAL PASS / CLOSED — NOT A/B/C ***
--   PASS = 85–100
--   CONDITIONAL PASS = 75–84 → mandatory 5-working-day follow-up;
--     must score 95+ with no major violations to upgrade to PASS
--   CLOSED = <75 OR imminent health hazard
--   Permit Suspension Hearing fee: $150
--   ~1,500–2,000 facilities
--   Transparency: HIGH
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'City of Pasadena Public Health Department — Environmental Health Division',

  scoring_type = 'pass_conditional_closed',
  grading_type = 'pass_conditional_closed',
  grading_config = '{
    "display_format": "pass_conditional_closed",
    "jurisdiction_type": "independent_city",
    "independent_from_county": true,
    "county_permits_invalid": true,
    "grades": {
      "PASS": {
        "min": 85, "max": 100,
        "label": "PASS",
        "color": "green",
        "passing": true,
        "reinspection_required": false,
        "note": "Acceptable compliance; major violations corrected on-site"
      },
      "CONDITIONAL_PASS": {
        "min": 75, "max": 84,
        "label": "CONDITIONAL PASS",
        "color": "yellow",
        "passing": false,
        "reinspection_required": true,
        "reinspection_window_days": 5,
        "reinspection_window_unit": "working_days",
        "rescore_threshold": 95,
        "note": "Must score 95+ with no major violations at follow-up to upgrade to PASS"
      },
      "CLOSED": {
        "min": 0, "max": 74,
        "label": "CLOSED",
        "color": "red",
        "passing": false,
        "reinspection_required": true,
        "triggers": ["score_below_75", "imminent_health_hazard", "vermin", "sewage_overflow", "no_water", "no_power", "no_operable_bathrooms", "fire_disaster", "operating_without_permit"],
        "hearing_fee_usd": 150
      }
    },
    "numeric_score": true,
    "score_start": 100,
    "placard_required": true,
    "placard_posted": true,
    "placard_label": "Health Inspection Summary Placard",
    "placard_legal_basis": "Pasadena Municipal Code Chapter 8.13",
    "placard_effective_date": "2014-07-01",
    "placard_location_requirement": "front door or front window within 5 feet of entrance",
    "report_online": true,
    "report_at_facility": true,
    "report_at_office": true,
    "transparency_level": "high",
    "online_portal": "https://www.decadeonline.com/main.phtml?agency=pas",
    "county_context": "Independent city (~1,500–2,000 facilities). Old Town Pasadena high-density restaurant district. Rose Bowl (major events, concerts, swap meet). Pasadena City College and Cal Tech campus food service.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'PASS/CONDITIONAL PASS/CLOSED. PASS=85-100, CONDITIONAL PASS=75-84 (5 working day follow-up; 95+ to upgrade), CLOSED=<75 ($150 hearing fee). INDEPENDENT CITY — NOT A/B/C.',

  pass_threshold = 85,
  warning_threshold = 75,
  critical_threshold = 74,

  fire_ahj_name = 'City of Pasadena Fire Department',
  fire_ahj_type = 'city_fire',
  has_local_amendments = true,
  local_amendment_notes = 'PASS/CONDITIONAL PASS/CLOSED per Pasadena Municipal Code Ch. 8.13 (effective July 1, 2014). NOT A/B/C. 5-working-day follow-up for CONDITIONAL PASS; 95+ to upgrade. Hearing fee $150. LA County permits invalid.',

  data_source_type = 'portal',
  data_source_url = 'https://www.decadeonline.com/main.phtml?agency=pas',
  data_source_tier = 1,
  facility_count = 1750,
  population_rank = 20,

  notes = 'STANDARDIZED March 2026. PASS/CONDITIONAL PASS/CLOSED. CRITICAL: grading_type = pass_conditional_closed — NOT letter_grade. HIGH transparency. INDEPENDENT CITY. Old Town Pasadena. Rose Bowl. Cal Tech.'

WHERE county = 'Los Angeles' AND city = 'Pasadena' AND state = 'CA';
