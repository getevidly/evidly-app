-- ============================================================
-- CALAVERAS COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Calaveras County Environmental Management Agency
--         — Environmental Health Division
-- Address: 891 Mountain Ranch Road, San Andreas, CA 95249
-- Phone: (209) 754-6399
-- Portal: ema.calaverasgov.us
-- Regulatory basis: CalCode
-- Verified: March 2026
--
-- KEY FACTS:
--   NO letter grades, NO numeric scores, NO confirmed placard
--   Inspection report only — standard CalCode violation classification
--   ~400–600 estimated facilities
--   No confirmed online portal for inspection results
--   Results available at facility
--   Transparency: MEDIUM
--   Key areas: San Andreas, Angels Camp, Murphys, Arnold, Copperopolis, Valley Springs
--   Sierra foothills wine country
--
-- Source: ema.calaverasgov.us — verified March 2026
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Calaveras County Environmental Management Agency — Environmental Health Division',
  agency_phone = '(209) 754-6399',
  agency_address = '891 Mountain Ranch Road, San Andreas, CA 95249',

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
    "transparency_level": "medium",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "county_context": "Sierra foothills wine country. San Andreas is county seat. Includes Stanislaus National Forest adjacent areas. Key areas: San Andreas, Angels Camp, Murphys, Arnold, Copperopolis, Valley Springs.",
    "food_handler_card": {
      "issuer": "CA-approved provider",
      "window_days": 30,
      "validity_years": 3,
      "note": "Standard CalCode requirement"
    },
    "food_safety_manager": {
      "required": true,
      "min_per_facility": 1,
      "exam_type": "ANSI_accredited"
    }
  }'::jsonb,

  scoring_methodology = 'Inspection report only. No confirmed placard system. Standard CalCode risk-based inspection. Results available at facility.',

  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  public_portal = 'https://www.ema.calaverasgov.us',
  regulatory_code = 'CalCode',
  transparency_level = 'medium',
  inspection_frequency = 'risk_based',

  fire_ahj_name = 'CAL FIRE / City of Angels Camp Fire / Calaveras Consolidated Fire / Ebbetts Pass Fire District',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments to CalCode grading confirmed.',

  data_source_type = 'portal',
  data_source_url = 'https://www.ema.calaverasgov.us',
  data_source_tier = 4,

  notes = 'STANDARDIZED March 2026. Inspection report only. MEDIUM transparency. Sierra foothills wine country. San Andreas is county seat. Includes Stanislaus National Forest adjacent areas. Key areas: San Andreas, Angels Camp, Murphys, Arnold, Copperopolis, Valley Springs.'

WHERE county = 'Calaveras' AND city IS NULL AND state = 'CA';
