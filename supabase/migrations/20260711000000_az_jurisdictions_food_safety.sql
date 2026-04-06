-- ================================================================
-- AZ-JIE-INSERT-01: Arizona Food Safety Jurisdictions
-- Inserts all 15 AZ county jurisdictions with verified grading_config.
--
-- Arizona food safety: A.R.S. Title 36 + Arizona Food Code
-- (A.A.C. Title 9, Chapter 8), based on FDA Food Code.
-- ADHS delegates to all 15 county health departments.
-- Maricopa operates under own Board of Supervisors authority.
--
-- Statewide standard: Excellent / Satisfactory / Needs Improvement / Unacceptable (12 of 15 counties).
-- Exceptions: Maricopa (voluntary A/B/C/D letter grades), Pima (5-tier),
--             Yavapai (own county code + Excellent / Satisfactory / Needs Improvement / Unacceptable).
-- ================================================================

-- Guard: skip entire INSERT if any AZ rows already exist.
DO $az_guard$
BEGIN
IF NOT EXISTS (SELECT 1 FROM jurisdictions WHERE state = 'AZ' LIMIT 1) THEN

INSERT INTO jurisdictions (
  state, county, city, agency_name, agency_type, jurisdiction_type,
  scoring_type, grading_type, grading_config,
  data_source_type, data_source_tier,
  notes, last_verified
) VALUES

-- ── Apache County ─────────────────────────────────────────────
(
  'AZ', 'Apache', NULL,
  'Apache County Public Health Services District',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "1999",
    "portal_url": null,
    "phone": "928-337-7607",
    "notes": "No online portal. ADHS delegation agreement valid through ~FY2033."
  }'::jsonb,
  'none', 5,
  'No online portal. ADHS delegation agreement valid through ~FY2033.',
  NOW()
),

-- ── Cochise County ────────────────────────────────────────────
(
  'AZ', 'Cochise', NULL,
  'Cochise County Environmental Health Services Division',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "2017",
    "portal_url": "https://www.cochise.az.gov/460/Environmental-Health-Services-Division",
    "phone": "520-432-9400",
    "notes": "Online inspection portal available."
  }'::jsonb,
  'portal', 4,
  'Online inspection portal available.',
  NOW()
),

-- ── Coconino County ───────────────────────────────────────────
(
  'AZ', 'Coconino', NULL,
  'Coconino County Health and Human Services',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "1999",
    "portal_url": "https://www.coconino.az.gov/229/Environmental-Health",
    "phone": "928-679-8760",
    "notes": "Unified Health Code. NEW online portal launched 2025. 2000+ licensed facilities, 3000+ routine inspections/yr. Unique Backcountry Specialist certification for Grand Canyon river guides."
  }'::jsonb,
  'portal', 4,
  'Unified Health Code. NEW online portal launched 2025. 2000+ licensed facilities, 3000+ routine inspections/yr. Unique Backcountry Specialist certification for Grand Canyon river guides.',
  NOW()
),

-- ── Gila County ───────────────────────────────────────────────
(
  'AZ', 'Gila', NULL,
  'Gila County Environmental Health Services',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "2017",
    "portal_url": "https://www.gilacountyaz.gov/government/health_and_emergency_services/h/food_safety_and_protection.php",
    "phone": "928-402-8811",
    "notes": "Two offices: Globe (928-402-8811) and Payson (928-474-1210). No online inspection results portal."
  }'::jsonb,
  'none', 5,
  'Two offices: Globe (928-402-8811) and Payson (928-474-1210). No online inspection results portal.',
  NOW()
),

-- ── Graham County ─────────────────────────────────────────────
(
  'AZ', 'Graham', NULL,
  'Graham County Department of Health Services',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "1999",
    "portal_url": null,
    "phone": "928-428-1962",
    "notes": "No online portal. ADHS delegation."
  }'::jsonb,
  'none', 5,
  'No online portal. ADHS delegation.',
  NOW()
),

-- ── Greenlee County ───────────────────────────────────────────
(
  'AZ', 'Greenlee', NULL,
  'Greenlee County Health Department',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "1999",
    "portal_url": null,
    "phone": "928-865-2601",
    "notes": "Smallest county food safety program in AZ. No online portal."
  }'::jsonb,
  'none', 5,
  'Smallest county food safety program in AZ. No online portal.',
  NOW()
),

-- ── La Paz County ─────────────────────────────────────────────
(
  'AZ', 'La Paz', NULL,
  'La Paz County Health Department',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "1999",
    "portal_url": null,
    "phone": "928-669-1100",
    "notes": "No online portal. ADHS delegation."
  }'::jsonb,
  'none', 5,
  'No online portal. ADHS delegation.',
  NOW()
),

-- ── Maricopa County ───────────────────────────────────────────
(
  'AZ', 'Maricopa', NULL,
  'Maricopa County Environmental Services Department',
  'county_health', 'food_safety',
  'rating', 'letter_grade',
  '{
    "type": "letter_grade_voluntary",
    "system": "Voluntary A/B/C/D letter grades",
    "levels": ["A", "B", "C", "D", "NP"],
    "delegation": "Own county authority (Board of Supervisors)",
    "fda_code_version": "2017",
    "portal_url": "https://envapp.maricopa.gov/EnvironmentalHealth/FoodInspections",
    "phone": "602-506-6616",
    "grade_details": {
      "A": "0 Priority + 0-1 Priority Foundation violations",
      "B": "1 Priority OR 2+ Priority Foundation violations",
      "C": "2+ Priority violations",
      "D": "Legal action for pattern of non-compliance or permit suspension",
      "NP": "Not Participating (inspections still occur)"
    },
    "permit_classes": [1, 2, 3, 4, 5],
    "inspection_frequency": {
      "class_1": "1x/year",
      "class_2": "1x/year",
      "class_3": "2x/year",
      "class_4": "2x/year",
      "class_5": "4x/year"
    },
    "notes": "Only AZ county operating under own county authority, NOT ADHS delegation. Voluntary grading since Oct 14, 2011. ~19,000 establishments. 60,000+ inspections/year. Cutting Edge Program for enhanced food safety. ArcGIS mobile app for public lookup."
  }'::jsonb,
  'portal', 2,
  'Only AZ county operating under own county authority, NOT ADHS delegation. Voluntary grading since Oct 14, 2011. ~19,000 establishments. 60,000+ inspections/year. Cutting Edge Program for enhanced food safety. ArcGIS mobile app for public lookup.',
  NOW()
),

-- ── Mohave County ─────────────────────────────────────────────
(
  'AZ', 'Mohave', NULL,
  'Mohave County Department of Public Health',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "2017",
    "portal_url": "https://www.mohave.gov/departments/public-health/environmental-health/food-safety/",
    "phone": "928-757-0901",
    "notes": "27 critical violation categories. Monthly PDF inspection reports posted online. Type I/II/III establishments."
  }'::jsonb,
  'portal', 4,
  '27 critical violation categories. Monthly PDF inspection reports posted online. Type I/II/III establishments.',
  NOW()
),

-- ── Navajo County ─────────────────────────────────────────────
(
  'AZ', 'Navajo', NULL,
  'Navajo County Department of Environmental Health',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "1999",
    "portal_url": null,
    "phone": "928-532-6050",
    "notes": "Holbrook (928-524-4750) and Show Low (928-532-6050) offices. No online portal — inspection reports available via public records request. Food Handler Certificate required within 30 days of employment."
  }'::jsonb,
  'none', 5,
  'Holbrook (928-524-4750) and Show Low (928-532-6050) offices. No online portal — inspection reports available via public records request. Food Handler Certificate required within 30 days of employment.',
  NOW()
),

-- ── Pima County ───────────────────────────────────────────────
(
  'AZ', 'Pima', NULL,
  'Pima County Consumer Health and Food Safety',
  'county_health', 'food_safety',
  'rating', 'tiered',
  '{
    "type": "tiered_five_level",
    "system": "5-tier: Excellent / Good / Satisfactory / Needs Improvement / Probation",
    "levels": ["Excellent", "Good", "Satisfactory", "Needs Improvement", "Probation"],
    "delegation": "ADHS",
    "fda_code_version": "2017",
    "portal_url": "https://healthinspect.pima.gov/portal/",
    "phone": "520-724-7908",
    "notes": "Enhanced from state 4-tier to 5-tier system Aug 2019. Added Good between Excellent and Satisfactory. Weighted scoring — critical violations weighted higher than non-critical. Online portal at healthinspect.pima.gov."
  }'::jsonb,
  'portal', 3,
  'Enhanced from state 4-tier to 5-tier system Aug 2019. Added Good between Excellent and Satisfactory. Weighted scoring — critical violations weighted higher than non-critical. Online portal at healthinspect.pima.gov.',
  NOW()
),

-- ── Pinal County ──────────────────────────────────────────────
(
  'AZ', 'Pinal', NULL,
  'Pinal County Division of Environmental Health',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "2017",
    "portal_url": "https://app1.pinal.gov/search/foodinspection-search.aspx",
    "phone": "866-287-0209",
    "establishment_types": {
      "Type_I": "Limited (bars no food, popcorn, candy, convenience stores)",
      "Type_II": "Moderate (limited menu, fast food, bakeries, school receiving)",
      "Type_III": "Complex (full-service, catering, hospitals, nursing homes, school cafeterias)"
    },
    "inspection_frequency": {
      "Type_I": "1x/year minimum",
      "Type_II": "2x/year minimum",
      "Type_III": "3x/year minimum"
    },
    "notes": "Active Managerial Control advocate. Online search portal at app1.pinal.gov."
  }'::jsonb,
  'portal', 3,
  'Active Managerial Control advocate. Online search portal at app1.pinal.gov.',
  NOW()
),

-- ── Santa Cruz County ─────────────────────────────────────────
(
  'AZ', 'Santa Cruz', NULL,
  'Santa Cruz County Health Services',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "ADHS statewide Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "1999",
    "portal_url": null,
    "phone": "520-375-7900",
    "notes": "No online portal. ADHS delegation. Border county — Nogales area."
  }'::jsonb,
  'none', 5,
  'No online portal. ADHS delegation. Border county — Nogales area.',
  NOW()
),

-- ── Yavapai County ────────────────────────────────────────────
(
  'AZ', 'Yavapai', NULL,
  'Yavapai County Community Health Services',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_county_code",
    "system": "Own county health code + Excellent / Satisfactory / Needs Improvement / Unacceptable + Golden Plate Award",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "Own county health code",
    "fda_code_version": "2009",
    "portal_url": "https://www.healthspace.com/clients/Arizona/Yavapai/Yavapai_Web_Live.nsf",
    "phone": "928-771-3149",
    "golden_plate_award": {
      "year_started": 2006,
      "2025_winners": 245,
      "criteria": [
        "Zero priority/priority foundation violations all calendar year",
        "Approved and implemented food safety plan",
        "Person-in-charge with current manager-level food safety cert all year"
      ]
    },
    "notes": "Own county health code (not just ADHS delegation). Golden Plate Award (19th year, 245 winners 2025). Food Safety Industry Council advisory board with UA Cooperative Extension. Three offices: Prescott, Prescott Valley, Cottonwood. HealthSpace online portal."
  }'::jsonb,
  'portal', 3,
  'Own county health code (not just ADHS delegation). Golden Plate Award (19th year, 245 winners 2025). Food Safety Industry Council advisory board with UA Cooperative Extension. Three offices: Prescott, Prescott Valley, Cottonwood. HealthSpace online portal.',
  NOW()
),

-- ── Yuma County ───────────────────────────────────────────────
(
  'AZ', 'Yuma', NULL,
  'Yuma County Public Health Services District',
  'county_health', 'food_safety',
  'rating', 'esnu',
  '{
    "type": "esnu_standard",
    "system": "Point-based Excellent / Satisfactory / Needs Improvement / Unacceptable",
    "levels": ["Excellent", "Satisfactory", "Needs Improvement", "Unacceptable"],
    "delegation": "ADHS",
    "fda_code_version": "2017",
    "portal_url": "https://www.yumacountyaz.gov/government/health-district/divisions/environmental-health-services/restaurant-ratings",
    "phone": "928-317-4584",
    "notes": "Point-based scoring system — violation points totaled to determine rating. Health Ordinance 07-04. Online restaurant ratings posted periodically. Walk-in food handler testing M-F 8am-4pm ($10 cash)."
  }'::jsonb,
  'portal', 4,
  'Point-based scoring system — violation points totaled to determine rating. Health Ordinance 07-04. Online restaurant ratings posted periodically. Walk-in food handler testing M-F 8am-4pm ($10 cash).',
  NOW()
);

END IF;
END $az_guard$;
