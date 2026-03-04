-- ============================================================
-- MONO COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Mono County Health Department — Environmental Health
-- Mammoth Lakes (primary): 1290 Tavern Road, Suite 246,
--   Mammoth Lakes, CA 93546 | (760) 924-1830
-- Bridgeport (county seat): 37 Emigrant Street, PO Box 476,
--   Bridgeport, CA 93517 | (760) 932-5580
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — no online portal
--   ~300–500 facilities
--   Transparency: LOW-MEDIUM
--   Mammoth Mountain ski resort — extreme seasonal surge
--   No incorporated cities (Mammoth Lakes is a town)
--   US-395 Eastern Sierra corridor
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Mono County Health Department — Environmental Health',

  scoring_type = 'inspection_report',
  grading_type = 'inspection_report',
  grading_config = '{
    "display_format": "inspection_report",
    "grades": {},
    "numeric_score": false,
    "placard_required": false,
    "placard_posted": false,
    "report_online": false,
    "report_at_facility": true,
    "report_at_office": true,
    "transparency_level": "low_medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "office_primary": { "name": "Mammoth Lakes", "address": "1290 Tavern Road, Suite 246, Mammoth Lakes, CA 93546", "phone": "(760) 924-1830" },
    "office_secondary": { "name": "Bridgeport", "address": "37 Emigrant Street, Bridgeport, CA 93517", "phone": "(760) 932-5580" },
    "county_context": "Eastern Sierra county (~300–500 facilities, concentrated near Mammoth Lakes). Mammoth Mountain ski resort is one of California''s largest — extreme seasonal food service surge in winter. No incorporated cities; Mammoth Lakes is a town. US-395 Eastern Sierra corridor. June Lake Loop, Crowley Lake, Bodie SHP. No confirmed online portal.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. ~300–500 facilities. Two offices: Mammoth Lakes primary (760-924-1830) + Bridgeport (760-932-5580). No online portal. Extreme Mammoth Mountain winter surge.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  fire_ahj_name = 'CAL FIRE Mono Unit / Town of Mammoth Lakes Fire / Bridgeport Valley FPD',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'office_request',
  data_source_url = NULL,
  data_source_tier = 4,
  facility_count = 400,
  population_rank = 51,

  notes = 'STANDARDIZED March 2026. Report-only. LOW-MEDIUM transparency. Two offices: Mammoth Lakes primary (760-924-1830) + Bridgeport (760-932-5580). Mammoth Mountain extreme winter seasonal surge. No incorporated cities. US-395 Eastern Sierra.'

WHERE county = 'Mono' AND city IS NULL AND state = 'CA';
