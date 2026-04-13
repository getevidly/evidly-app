-- ============================================================
-- IMPERIAL COUNTY — Food Safety Jurisdiction Standardization
--
-- Agency: Imperial County Public Health Department
--         — Environmental Health Division
-- Address: 1221 W. State Street, Suite B, El Centro, CA 92243
--          *** RELOCATED — old address 797 Main St still in some PDFs ***
-- Phone: (442) 265-1888 | Fax: (442) 265-1903
-- Grading Guide: icphd.org/assets/.../Food-Inspection-and-Grading-Guide-10.12-23.pdf
-- Regulatory basis: CalCode + local grading guide
-- Verified: March 2026
--
-- KEY FACTS:
--   LETTER GRADE A / B / C system confirmed per official guide (10/12/2023)
--   A=90-100 | B=80-89 | C=<80
--   C grade: corrections required + reinspection request within 30 days
--   B grade: no mandatory reinspection; operator may request re-score
--   ~800–1,200 facilities
--   Transparency: HIGH
--   US/Mexico border county. El Centro county seat.
--   Calexico border city (Mexicali crossing).
-- ============================================================

UPDATE jurisdictions SET
  agency_name = 'Imperial County Public Health Department — Environmental Health Division',

  scoring_type = 'letter_grade',
  grading_type = 'letter_grade',
  grading_config = '{
    "display_format": "letter_grade",
    "grades": {
      "A": { "min": 90, "max": 100, "label": "A", "color": "green",  "passing": true, "reinspection_required": false },
      "B": { "min": 80, "max": 89,  "label": "B", "color": "yellow", "passing": true, "reinspection_required": false, "reinspection_optional": true },
      "C": { "min": 0,  "max": 79,  "label": "C", "color": "red",    "passing": false, "reinspection_required": true, "correction_window_days": 30 }
    },
    "numeric_score": true,
    "score_start": 100,
    "placard_required": true,
    "placard_posted": true,
    "placard_label": "Letter Grade Card",
    "report_online": true,
    "report_at_facility": true,
    "report_at_office": true,
    "transparency_level": "high",
    "violation_categories": ["major", "minor"],
    "inspection_frequency": "risk_based",
    "address_note": "EHD relocated to 1221 W. State St., Suite B — old address 797 Main St. still appears in some PDFs",
    "grading_guide_url": "https://www.icphd.org/assets/Environmental-Health/Food/Food-Inspection-and-Grading-Guide-10.12-23.pdf",
    "county_context": "US/Mexico border county (~800–1,200 facilities). El Centro county seat; Calexico border city (Mexicali crossing); Brawley, Imperial. Large agricultural workforce. International Calexico-Mexicali crossing. I-8 corridor (San Diego to Arizona) transient traffic. Salton Sea recreation.",
    "food_handler_card": { "issuer": "CA-approved provider", "window_days": 30, "validity_years": 3 },
    "food_safety_manager": { "required": true, "min_per_facility": 1, "exam_type": "ANSI_accredited" }
  }'::jsonb,

  scoring_methodology = 'Letter Grade A / B / C. 100-point deduction. A=90-100 (no reinspection), B=80-89 (optional re-score), C=<80 (corrections + reinspection within 30 days). Grade Card posted conspicuously. Confirmed per official guide (10/12/2023).',

  pass_threshold = 90,
  warning_threshold = 80,
  critical_threshold = 79,

  fire_ahj_name = 'CAL FIRE San Diego Unit / El Centro Fire / Calexico Fire / Brawley Fire / Imperial Fire',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = true,
  local_amendment_notes = 'Own Retail Food Inspection and Grading Guide (rev 10/12/2023). C grade reinspection window = 30 days. B grade reinspection optional. CRITICAL: address relocated to 1221 W. State St., Suite B.',

  data_source_type = 'portal',
  data_source_url = 'https://www.icphd.org/environmental-health/food',
  data_source_tier = 1,
  facility_count = 1000,
  population_rank = 30,

  notes = 'STANDARDIZED March 2026. LETTER GRADE A / B / C. HIGH transparency. Confirmed per official guide (10/12/2023). CRITICAL: address is 1221 W. State St. (not 797 Main St.). C grade = correction + 30-day reinspection. US/Mexico border. Large agricultural workforce.'

WHERE county = 'Imperial' AND city IS NULL AND state = 'CA';
