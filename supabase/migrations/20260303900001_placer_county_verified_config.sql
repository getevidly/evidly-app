-- ═══════════════════════════════════════════════════════════════════════
-- PLACER COUNTY — Verified Jurisdiction Configuration
--
-- Agency: Placer County Health and Human Services
--         Environmental Health Division, Food Protection Program
-- Address (Auburn): 11434 B Avenue, Auburn, CA 95603
-- Phone (Auburn): (530) 889-7141
-- Address (Tahoe): 5225 N. Lake Blvd., Carnelian Bay, CA 96140
-- Phone (Tahoe): (530) 546-1912
-- Portal: placer.ca.gov/3337/Food-Protection-Program
-- Inspection results: placer.ca.gov/3361/Restaurant-Inspections
-- Regulatory basis: CalCode
-- Transparency: HIGH — GYR placard posted + online results
-- Verified: March 2026
--
-- Verified facts:
--   - GREEN/YELLOW/RED placard system (modeled after Sacramento GYR)
--   - GREEN = PASS — no uncorrected majors
--   - YELLOW = CONDITIONAL PASS — any failure to correct/mitigate a major
--     violation, OR violation of a Compliance Agreement
--   - RED = CLOSED — imminent danger that cannot be corrected during inspection
--   - No numeric score
--   - Placard posted near front door
--   - IMPORTANT: Yellow threshold differs from Sacramento — single uncorrected
--     major can trigger Yellow (Sacramento requires 2+)
--   - Inspections target CDC's five most critical risk factors
--   - Two offices: Auburn HQ and Tahoe branch
--   - Fire AHJ: mixed CAL FIRE / local city/district fire departments
--   - Source: placer.ca.gov/5964/Placard-Program---Food-Safety
-- ═══════════════════════════════════════════════════════════════════════

-- Update Placer County jurisdiction with verified configuration
UPDATE jurisdictions SET
  -- Verified agency details
  agency_name = 'Placer County Health and Human Services — Environmental Health Division, Food Protection Program',

  -- Verified scoring/grading (GYR placard)
  scoring_type = 'color_placard',
  grading_type = 'green_yellow_red',
  grading_config = '{
    "display_format": "color_placard",
    "placards": [
      {
        "color": "green",
        "status": "pass",
        "label": "PASS",
        "criteria": "No major violations observed during the inspection, OR all major violations observed are corrected or mitigated by the end of the inspection."
      },
      {
        "color": "yellow",
        "status": "conditional_pass",
        "label": "CONDITIONAL PASS",
        "criteria": "Failure to correct or mitigate any major violation observed during inspection, OR violation of a Compliance Agreement (which may include failure to correct ongoing or repeating major and minor violations)."
      },
      {
        "color": "red",
        "status": "closed",
        "label": "CLOSED",
        "criteria": "Closure of the facility due to any condition that poses an imminent danger to public health and safety that cannot be corrected or mitigated during the inspection."
      }
    ],
    "numeric_score": false,
    "placard_posted": true,
    "placard_location": "Near front door of restaurant, grocery store, or convenience store",
    "report_online": true,
    "inspection_frequency": "risk_based",
    "transparency_level": "high",
    "cdc_risk_factors": ["food from unsafe sources", "inadequate cooking temperatures", "improper holding temperatures", "contaminated equipment", "poor employee hygiene"],
    "grading_note": "Yellow threshold differs from Sacramento — failure to correct even a single major violation triggers Yellow, as does a Compliance Agreement violation. Two offices serve the county: Auburn HQ and Tahoe branch.",
    "public_portal": "https://www.placer.ca.gov/3361/Restaurant-Inspections"
  }'::jsonb,
  scoring_methodology = 'GYR placard based on major violation compliance. Green=pass (no uncorrected majors). Yellow=conditional (failure to correct/mitigate ANY major, or compliance agreement violation). Red=closure (imminent danger, cannot correct during inspection). No numeric score. Two offices: Auburn and Tahoe.',

  -- NO numeric thresholds — violation-based placard system
  pass_threshold = NULL,
  warning_threshold = NULL,
  critical_threshold = NULL,

  -- Verified fire AHJ
  fire_ahj_name = 'CAL FIRE / Placer Hills Fire / City Fire Departments / South Placer Fire District',
  fire_ahj_type = 'mixed_cal_fire_city',
  has_local_amendments = false,
  local_amendment_notes = 'No local amendments identified beyond CalCode. Placard program modeled after Sacramento County GYR system.',

  -- Verified data source
  data_source_type = 'portal',
  data_source_url = 'https://www.placer.ca.gov/3361/Restaurant-Inspections',
  data_source_tier = 1,

  -- Facility count not verified — using previous estimate
  facility_count = 2200,
  population_rank = 22,

  -- Updated notes with verification info
  notes = 'STANDARDIZED March 2026. GYR placard system. HIGH transparency. Two offices: Auburn HQ (530-889-7141) and Tahoe branch (530-546-1912). Yellow definition differs from Sacramento — single uncorrected major can trigger Yellow. Inspections target CDC five critical risk factors. Placard posted near front door.'
WHERE county = 'Placer'
  AND city IS NULL
  AND state = 'CA';
