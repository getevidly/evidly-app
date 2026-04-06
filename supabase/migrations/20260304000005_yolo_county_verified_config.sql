-- ════════════════════════════════════════════════════════════════════════
-- YOLO COUNTY — VERIFIED FOOD SAFETY JURISDICTION CONFIG
-- JIE Standardization Series | March 2026
-- ════════════════════════════════════════════════════════════════════════
--
-- Agency:        Yolo County Environmental Health Division (Community Services)
-- Address:       292 W. Beamer Street, Woodland, CA 95695
-- Phone:         (530) 666-8646
-- Portal:        yolocounty.gov/…/restaurant-inspection-report-search
-- Regulatory:    CalCode
-- Scoring:       Green/Yellow/Red placard (launched July 1, 2017)
-- Grading:       green_yellow_red (no numeric score)
-- Transparency:  HIGH — Green / Yellow / Red placard posted + QR code links to online database
-- Facilities:    ~700 fixed food facilities
-- Fire AHJ:      Yolo County OES / city fire departments
--
-- PLACARD SYSTEM:
--   GREEN  = PASS — ≤1 major violation, corrected. Facility compliant.
--   YELLOW = CONDITIONAL PASS — 1+ major violations. Re-inspection within 3 business days.
--   RED    = CLOSED — Imminent health hazard (vermin, no refrigeration, no hot water, sewage).
--
-- PLACARD DETAILS:
--   Posted near front door. Includes QR code to EH inspection database.
--   Required for ALL retail food facilities including food trucks + community events.
--   Cottage food operators and temp event booths exempt from placarding.
--
-- FIVE CDC MAJOR RISK FACTORS tracked:
--   1. Hygiene  2. Food Temperatures  3. Food Sources  4. Equipment contamination  5. Employee health
--
-- INSPECTION FREQUENCY: 1–2 routine inspections per year (risk-based).
--
-- COUNTY CONTEXT: Davis (UC Davis), Woodland (county seat), West Sacramento, Winters.
--   Single EHD office in Woodland. One of California's smaller county programs.
--
-- DATA SOURCES (verified March 2026):
--   1. https://www.yolocounty.gov/government/general-government-departments/community-services/environmental-health-division
--   2. https://www.yolocounty.gov/government/general-government-departments/community-services/environmental-health-division/restaurant-inspection-report-search
--   3. Winters Express, July 2017 — GYR launch coverage
--   4. West Sacramento News-Ledger, July 2024 — Food Safety Forum article
--
-- CONFIDENCE: 95/100 — multiple independent sources confirm Green / Yellow / Red placard, QR code,
--   July 2017 launch date, and HIGH transparency. Exact facility count approximated.
-- ════════════════════════════════════════════════════════════════════════

UPDATE jurisdictions SET
  agency_name            = 'Yolo County Environmental Health Division',
  agency_phone           = '(530) 666-8646',
  agency_address         = '292 W. Beamer Street, Woodland, CA 95695',
  public_portal          = 'https://www.yolocounty.gov/government/general-government-departments/community-services/environmental-health-division/restaurant-inspection-report-search',
  regulatory_code        = 'CalCode',
  scoring_type           = 'color_placard',
  grading_type           = 'green_yellow_red',
  pass_threshold         = NULL,
  warning_threshold      = NULL,
  critical_threshold     = NULL,
  transparency_level     = 'high',
  inspection_frequency   = 'risk_based',
  facility_count         = 700,
  fire_ahj_name          = 'Yolo County Office of Emergency Services / City fire departments (Davis, Woodland, West Sacramento)',
  fire_ahj_type          = 'mixed_county_city',
  has_local_amendments   = false,
  scoring_methodology    = 'Green / Yellow / Red placard based on major violation presence. Green=PASS (no more than 1 major violation). Yellow=CONDITIONAL PASS (1+ major violations, re-inspection within 3 business days). Red=CLOSED (imminent health hazard). QR code on placard links to online database. Launched July 1, 2017. NO numeric score. ~700 facilities.',
  notes                  = 'STANDARDIZED March 2026. Green / Yellow / Red placard launched July 1, 2017. Modeled after Sacramento County Green / Yellow / Red system. QR code on placard. HIGH transparency. ~700 fixed facilities. Single EHD office in Woodland. CFOs and temp event booths exempt from placarding.',
  data_source_url        = 'https://www.yolocounty.gov/government/general-government-departments/community-services/environmental-health-division',
  data_source_type       = 'html_searchable',
  data_source_tier       = 1,
  confidence_score       = 95,
  last_verified          = '2026-03-04',
  updated_at             = now()
WHERE county = 'Yolo' AND city IS NULL;
