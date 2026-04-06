-- ============================================================
-- CITY OF VERNON (INDEPENDENT CITY) — Food Safety Jurisdiction Standardization
--
-- Agency: City of Vernon Department of Health & Environmental Control (DHEC)
-- Address: 4305 S. Santa Fe Avenue, Vernon, CA 90058
-- Hours: Monday–Thursday 7:00am–5:30pm
-- Regulatory basis: CalCode + LA County letter grade ordinance (adopted)
-- Verified: March 2026
--
-- KEY FACTS:
--   INDEPENDENT CITY — LA County EHD has NO jurisdiction
--   LA County permits NOT valid within Vernon city limits
--   One of only 4 cities in CA with own health dept
--     (funded entirely by city — no state/federal funds)
--   ~1,800 businesses; primarily industrial food manufacturers/processors
--   Adopted LA County letter grade ordinance — A/B/C system
--   ~50–150 retail food facilities; large food processing sector
--   Transparency: MEDIUM (industrial context; limited public-facing retail)
--   DHEC also serves as CUPA for hazmat/industrial compliance
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'City of Vernon Department of Health & Environmental Control (DHEC)',

  scoring_type = 'letter_grade',
  grading_type = 'letter_grade',
  grading_config = '{
    "display_format": "letter_grade",
    "jurisdiction_type": "independent_city",
    "independent_from_county": true,
    "county_permits_invalid": true,
    "grades": {
      "A": { "min": 90, "max": 100, "label": "A", "color": "green",  "passing": true },
      "B": { "min": 80, "max": 89,  "label": "B", "color": "yellow", "passing": false },
      "C": { "min": 0,  "max": 79,  "label": "C", "color": "red",    "passing": false }
    },
    "numeric_score": true,
    "score_start": 100,
    "placard_required": true,
    "placard_posted": true,
    "placard_label": "Letter Grade Card",
    "report_online": false,
    "report_at_facility": true,
    "report_at_office": true,
    "transparency_level": "medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Exclusively industrial city (~1,800 businesses; 5.2 sq miles). Only ~50–150 public-facing retail food facilities. Large food manufacturing/processing sector (poultry, meat, produce, baked goods, etc.) — these are inspected under CalCode and may not carry letter grade placards depending on facility type. DHEC is the only CA independent city health dept operating without state or federal funds. No confirmed public online inspection portal. Adjacent to City of Commerce, Maywood, Huntington Park.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Letter Grade A / B / C following LA County methodology. INDEPENDENT CITY. Primarily industrial food manufacturers/processors. ~50–150 retail food facilities. No online portal.',

  pass_threshold = 90,
  warning_threshold = 80,
  critical_threshold = 79,

  fire_ahj_name = 'City of Vernon Fire Department',
  fire_ahj_type = 'city_fire',
  has_local_amendments = false,
  local_amendment_notes = 'Follows CalCode. Adopted LA County letter grade system. LA County permits invalid within Vernon. DHEC also serves as CUPA (Certified Unified Program Agency) for hazmat/industrial compliance.',

  data_source_type = 'office_request',
  data_source_url = NULL,
  data_source_tier = 4,
  facility_count = 100,
  population_rank = 58,

  notes = 'STANDARDIZED March 2026. LETTER GRADE A / B / C. MEDIUM transparency. INDEPENDENT CITY — NOT LA County EHD. Primarily industrial; food manufacturing/processing dominant. ~50–150 public-facing retail facilities. No online portal. DHEC at 4305 S. Santa Fe Ave (Mon–Thu 7am–5:30pm). Only CA independent city health dept with no state/federal funding.'

WHERE county = 'Los Angeles' AND city = 'Vernon' AND state = 'CA';
