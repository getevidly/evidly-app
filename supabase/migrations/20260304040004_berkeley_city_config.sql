-- ============================================================
-- CITY OF BERKELEY (INDEPENDENT CITY) — Food Safety Jurisdiction Standardization
--
-- Agency: City of Berkeley — Environmental Health Division
-- Address: 2180 Milvia Street, 2nd Floor, Berkeley, CA 94704
-- Phone: (510) 981-5310
-- Regulatory basis: CalCode + Berkeley Municipal Code Title 11 (Ch. 11.28)
-- Verified: March 2026
--
-- KEY FACTS:
--   INDEPENDENT CITY — Alameda County EHD has NO jurisdiction within Berkeley
--   Alameda County permits NOT valid within Berkeley city limits
--   NO letter grade system — inspection report / pass-fail approach
--   Inspection reports available to public upon written request
--   ~1,500–2,000 facilities
--   Transparency: MEDIUM
--   UC Berkeley campus food service NOT under City EHD
--     (UC Regents exempt from local EHD authority)
--   Gourmet Ghetto, Telegraph Ave, Fourth Street, Shattuck Ave
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'City of Berkeley — Environmental Health Division',

  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "jurisdiction_type": "independent_city",
    "independent_from_county": true,
    "county_permits_invalid": true,
    "grades": {},
    "numeric_score": false,
    "placard_required": false,
    "placard_posted": false,
    "report_online": false,
    "report_at_facility": false,
    "report_at_office": true,
    "report_available_on_request": true,
    "transparency_level": "medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "regulatory_basis": ["CalCode", "Berkeley Municipal Code Title 11 Chapter 11.28"],
    "county_context": "Independent city (~1,500–2,000 facilities). NOT under Alameda County EHD. No public letter grade or placard system — CalCode compliance + Berkeley Municipal Code Title 11. Inspection reports available to public upon request. CRITICAL EXCEPTION: UC Berkeley campus food facilities are inspected by the University of California Regents (not City EHD). Fourth Street retail corridor, Telegraph Ave, Shattuck Ave restaurant density, Gourmet Ghetto (North Shattuck). Graduate student and faculty population generates diverse food scene.",
    "uc_regents_exception": true,
    "uc_regents_note": "UC Berkeley campus dining and food facilities are NOT under City of Berkeley EHD — they are inspected under UC Regents authority.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. No letter grade or placard system. Follows CalCode + Berkeley Municipal Code Title 11. Reports available on request. UC Berkeley campus NOT under City EHD.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'City of Berkeley Fire Department',
  fire_ahj_type = 'city_fire',
  has_local_amendments = true,
  local_amendment_notes = 'Berkeley Municipal Code Title 11 (Ch. 11.28) supplements CalCode. No letter grade system. Alameda County EHD permits NOT valid within Berkeley. UC Regents exempt from City EHD authority for on-campus food facilities.',

  data_source_type = 'office_request',
  data_source_url = 'https://berkeleyca.gov/doing-business/operating-berkeley/food-service/food-safety-and-inspection-program',
  data_source_tier = 4,
  facility_count = 1750,
  population_rank = 18,

  notes = 'STANDARDIZED March 2026. Report-only. MEDIUM transparency. INDEPENDENT CITY — NOT Alameda County EHD. No letter grade/placard system. Berkeley Municipal Code Title 11. Reports on request only. UC Berkeley campus food facilities EXEMPT (UC Regents authority). Gourmet Ghetto, Telegraph Ave, Fourth Street, Shattuck Ave.'

WHERE county = 'Alameda' AND city = 'Berkeley' AND state = 'CA';
