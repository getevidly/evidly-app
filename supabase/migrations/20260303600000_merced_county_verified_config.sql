-- ═══════════════════════════════════════════════════════════════════════
-- MERCED COUNTY — Verified Jurisdiction Configuration
--
-- Agency: Merced County Department of Public Health
--         Division of Environmental Health
-- Address: 260 E 15th St, Merced, CA 95340
-- Phone: (209) 381-1100
-- Portal: countyofmerced.com/departments/public-health
-- Regulatory basis: CalCode + local point accumulation system
-- Transparency: HIGH
-- Verified: March 2026
--
-- Verified facts:
--   - Unique three-tier POINT-BASED system
--   - Points ACCUMULATE upward per violation (not deductive)
--   - Good: 0-6 points, Satisfactory: 7-13 points, Unsatisfactory: 14+ points
--   - NO letter grades
--   - Grade card posted at facility
--   - Award of Excellence program for zero-major facilities
--   - ~3,500 permitted facilities
--   - Transparency: HIGH — inspection results publicly accessible
--   - Fire AHJ: City of Merced Fire Department (city), CAL FIRE MMU (unincorporated)
--   - Food Safety Manager cert required per CalCode §113716
--   - Data source: countyofmerced.com (Tier 3)
-- ═══════════════════════════════════════════════════════════════════════

-- Update Merced County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Merced County Department of Public Health — Division of Environmental Health',

  -- Verified scoring/grading (point accumulation, three-tier rating)
  scoring_type = 'point_accumulation',
  grading_type = 'point_accumulation_tiered',
  grading_config = '{
    "display_format": "point_accumulation_tiered",
    "tiers": {
      "Good": [0, 6],
      "Satisfactory": [7, 13],
      "Unsatisfactory": [14, null]
    },
    "point_values": {
      "critical": 4,
      "major": 2,
      "minor": 1
    },
    "direction": "accumulate_up",
    "letter_grade": false,
    "numeric_score": false,
    "grade_card_posted": true,
    "transparency_level": "high",
    "award_of_excellence": {
      "available": true,
      "criteria": "Zero major violations across all routine inspections in evaluation period"
    },
    "grading_note": "Points accumulate upward per violation. Good (0-6), Satisfactory (7-13), Unsatisfactory (14+). No letter grades. Award of Excellence for zero-major facilities."
  }'::jsonb,
  scoring_methodology = 'Unique point-accumulation system. Points accumulate UPWARD per violation: critical=4pts, major=2pts, minor=1pt. Good (0-6 pts), Satisfactory (7-13 pts), Unsatisfactory (14+ pts). NO letter grades. Grade card posted at facility. Award of Excellence for facilities with zero major violations across all routine inspections.',

  -- NO numeric thresholds — tier-based system
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'City of Merced Fire Department (city limits); CAL FIRE MMU (unincorporated)',
  fire_ahj_type = 'city_fire_and_cal_fire',
  has_local_amendments = true,
  local_amendment_notes = 'Local point accumulation grading system unique to Merced County. CalCode base with local three-tier rating overlay. Food Safety Manager cert required per CalCode §113716 within 60 days.',

  -- Verified data source
  data_source_type = 'portal',
  data_source_url = 'https://www.countyofmerced.com/departments/public-health',
  data_source_tier = 3,

  -- Verified facility count
  facility_count = 3500,
  population_rank = 18,

  -- Updated notes with verification info
  notes = 'VERIFIED (2026-03). Unique three-tier point-accumulation system: Good (0-6 pts), Satisfactory (7-13 pts), Unsatisfactory (14+ pts). Points accumulate upward per violation. NO letter grades. Grade card posted. Award of Excellence for zero-major facilities. Transparency HIGH. ~3,500 permitted facilities. Fire AHJ: City of Merced FD (city), CAL FIRE MMU (unincorporated). Food Safety Manager cert required per CalCode §113716 within 60 days. Contact: (209) 381-1100.'
WHERE county = 'Merced'
  AND city IS NULL
  AND state = 'CA';
