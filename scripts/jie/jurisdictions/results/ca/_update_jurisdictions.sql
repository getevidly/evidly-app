-- EvidLY Jurisdiction Intelligence Engine — DB Update
-- Generated: 2026-02-19 19:44 UTC
-- Records: 51
-- Source: results\ca
--
-- Run in Supabase SQL Editor or via Claude Code
-- These UPDATE existing seeded rows with crawl-verified data

BEGIN;

-- Alameda County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Alameda County Department of Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "Numerical scoring system (0-100 points) with color-coded placard display. Each inspection starts with 100 points, violations deduct points based on food safety risk level. Major CDC Risk Factor violations are 2-4 points each, minor violations are 1 point each.", "grade_thresholds": {"Green (Pass)": {"description": "Pass score"}, "Yellow (Conditional Pass)": {"description": "Conditional pass score"}, "Red (Closed)": {"description": "Failed inspection - facility closed"}}, "score_range_min": 0, "score_range_max": 100}'::jsonb,
    scoring_methodology = 'California Retail Food Code 2022. Numerical scoring system (0-100 points) with color-coded placard display. Each inspection starts with 100 points, violations deduct points based on food safety risk level. Major CDC Risk Factor violations are 2-4 points each, minor violations are 1 point each.',
    violation_weight_map = '{"grade_thresholds": {"Green (Pass)": {"description": "Pass score"}, "Yellow (Conditional Pass)": {"description": "Conditional pass score"}, "Red (Closed)": {"description": "Failed inspection - facility closed"}}, "methodology_description": "Numerical scoring system (0-100 points) with color-coded placard display. Each inspection starts with 100 points, violations deduct points based on food safety risk level. Major CDC Risk Factor violations are 2-4 points each, minor violations are 1 point each."}'::jsonb,
    fire_ahj_name = 'Alameda County Fire Department - Fire Prevention Bureau',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://deh.acgov.org/operations/food-safety.page',
    notes = 'JIE crawl: confidence=high(?) | All information verified from official Alameda County sources. System uses 100-point scoring with color-coded placards (Green=Pass, Yellow=Conditional Pass, Red=Closed). Major violations worth 2-4 points, minor violations worth 1 point each. | Inspection freq: Risk-based routine inspections conducted on unannounced basis, frequency determined by facility risk assessment | Reinspection: Conditional pass requires reinspection; imminent health hazards require immediate closure and reinspection for reopening',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Alameda');

-- Alpine County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Alpine County Health and Human Services Department - Environmental Health Services',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "No specific grading system information found on official county website"}'::jsonb,
    scoring_methodology = 'California Retail Food Code. No specific grading system information found on official county website',
    violation_weight_map = '{"methodology_description": "No specific grading system information found on official county website"}'::jsonb,
    fire_ahj_name = 'Alpine County Fire Departments',
    fire_ahj_type = 'county_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://alpinecountyca.gov/200/Environmental-Health',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Manual verification required to obtain specific details about: 1) Whether Alpine County uses letter grades, numerical scores, or pass/fail system; 2) Inspection frequency and risk-based scheduling; 3) Fire department requirements for commercial kitchen suppression systems; 4) Local ordinances beyond state requirements. Contact Alpine County Health Department at 530-694-2235 or 530-694-2146 ext. 222. | Inspection freq: Not specified in official sources | Reinspection: Not specified in official sources',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Alpine');

-- Amador County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Amador County Environmental Health Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "System type not specified on official website. Results posted at facilities and available at Environmental Health Department but grading methodology not detailed."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - California Health and Safety Code. System type not specified on official website. Results posted at facilities and available at Environmental Health Department but grading methodology not detailed.',
    violation_weight_map = '{"methodology_description": "System type not specified on official website. Results posted at facilities and available at Environmental Health Department but grading methodology not detailed."}'::jsonb,
    fire_ahj_name = 'Multiple agencies - Amador Fire Protection District, City of Jackson Fire Department, other local fire protection districts',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.amadorcounty.gov/departments/environmental-health/food-program',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Amador County Environmental Health Department (209) 223-6439 required to verify: 1) Specific grading/scoring system used 2) Risk-based inspection categories 3) Reinspection triggers and thresholds 4) Local ordinances beyond state requirements 5) Specific fire authority jurisdiction for commercial kitchens | Inspection freq: annual inspections | Reinspection: Not specified on official sources',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Amador');

-- Butte County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Butte County Environmental Health (BCEH)',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "other", "description": "Color-coded placard system with Green (Pass), Yellow (Conditional Pass), and Red (Closed) placards based on major violations and compliance status", "grade_thresholds": {"Green": {"criteria": "No more than one major violation that is mitigated or corrected during inspection"}, "Yellow": {"criteria": "Two or more major violations, violation of compliance agreement, or same major violation in three consecutive inspections"}, "Red": {"criteria": "Imminent health hazard requiring closure that cannot be mitigated or corrected during inspection"}}}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode). Color-coded placard system with Green (Pass), Yellow (Conditional Pass), and Red (Closed) placards based on major violations and compliance status',
    violation_weight_map = '{"grade_thresholds": {"Green": {"criteria": "No more than one major violation that is mitigated or corrected during inspection"}, "Yellow": {"criteria": "Two or more major violations, violation of compliance agreement, or same major violation in three consecutive inspections"}, "Red": {"criteria": "Imminent health hazard requiring closure that cannot be mitigated or corrected during inspection"}}, "methodology_description": "Color-coded placard system with Green (Pass), Yellow (Conditional Pass), and Red (Closed) placards based on major violations and compliance status"}'::jsonb,
    fire_ahj_name = 'CAL FIRE/Butte County Fire Department - Fire Marshal Bureau',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.buttecounty.net/767/Food-Program',
    notes = 'JIE crawl: confidence=high(?) | All key information verified through official Butte County Environmental Health and Fire Department websites. Color-coded placard system is unique compared to letter grade systems used in other CA counties. | Inspection freq: BCEH conducts 2000+ routine health inspections per year for approximately 1200 retail food facilities | Reinspection: Yellow placard violations require follow-up inspection within timeframe specified. Red placard requires closure until compliance achieved.',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Butte');

-- Calaveras County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Calaveras County Environmental Management Agency (EMA) - Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Unable to verify specific grading/scoring system used by Calaveras County. No official documentation found showing letter grades, numerical scores, or other specific grading methodology."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - referenced in temporary food facility applications. Unable to verify specific grading/scoring system used by Calaveras County. No official documentation found showing letter grades, numerical scores, or other specific grading methodology.',
    violation_weight_map = '{"methodology_description": "Unable to verify specific grading/scoring system used by Calaveras County. No official documentation found showing letter grades, numerical scores, or other specific grading methodology."}'::jsonb,
    fire_ahj_name = 'CAL FIRE (California Department of Forestry and Fire Protection) Tuolumne-Calaveras Unit and local fire departments',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://ema.calaverasgov.us/Environmental-Health/Food-Facility-Program',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Calaveras County Environmental Health Department at (209) 754-6399 required to verify: 1) Specific grading/scoring system used for food facility inspections, 2) Inspection frequency and risk-based scheduling, 3) Public disclosure requirements, 4) Local ordinances beyond CalCode, 5) Specific fire department(s) conducting commercial kitchen inspections, 6) Complete permit requirements and fees. Website technical issues prevent access to detailed program information. | Inspection freq: Unable to verify specific inspection frequency from official sources | Reinspection: Re-inspection fees are charged for violations requiring follow-up, temporary food facilities subject to re-inspection and/or closure if requirements not met at initial inspection',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Calaveras');

-- Colusa County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Colusa County Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Grading system not clearly defined in available sources. County enforces California Retail Food Code but specific grading methodology not documented."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (commonly called Cal Code) - part of California Health and Safety Code. Grading system not clearly defined in available sources. County enforces California Retail Food Code but specific grading methodology not documented.',
    violation_weight_map = '{"methodology_description": "Grading system not clearly defined in available sources. County enforces California Retail Food Code but specific grading methodology not documented."}'::jsonb,
    fire_ahj_name = 'Multiple fire districts serve Colusa County including Sacramento River Fire Protection District and City of Colusa Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.countyofcolusaca.gov/425/Retail-Food-Safety',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Need to contact Colusa County Environmental Health directly at (530) 458-0888 to verify: 1) Specific grading/scoring system used (letter grades vs numerical vs pass/fail), 2) Detailed fire department authority structure for commercial kitchen inspections, 3) Local ordinances beyond state requirements, 4) Risk-based inspection frequency categories, 5) Public disclosure mechanisms beyond state requirements. | Inspection freq: Risk-based inspections required under California Retail Food Code | Reinspection: Violations requiring correction and follow-up verification',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Colusa');

-- Contra Costa County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Contra Costa Health - Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "other", "description": "Color-coded placarding system with green, yellow, red, and white placards", "grade_thresholds": {"Green": {"description": "No or minimal health violations found at most recent inspection"}, "Yellow": {"description": "Major health violations found but corrected during inspection, reinspection required"}, "Red": {"description": "Imminent health hazard resulting in facility closure"}, "White": {"description": "Permit holders waiting for renewal or reopening after closure"}}}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC) - implemented July 1, 2007, modeled after FDA Food Code. Color-coded placarding system with green, yellow, red, and white placards',
    violation_weight_map = '{"grade_thresholds": {"Green": {"description": "No or minimal health violations found at most recent inspection"}, "Yellow": {"description": "Major health violations found but corrected during inspection, reinspection required"}, "Red": {"description": "Imminent health hazard resulting in facility closure"}, "White": {"description": "Permit holders waiting for renewal or reopening after closure"}}, "methodology_description": "Color-coded placarding system with green, yellow, red, and white placards"}'::jsonb,
    fire_ahj_name = 'Contra Costa County Fire Protection District',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.cchealth.org/health-and-safety-information/restaurant-inspections',
    notes = 'JIE crawl: confidence=high(?) | Color-coded placarding system is well-documented on official county health department website. Fire suppression system requirements confirmed through county fire district documentation. CRFC implementation verified from multiple sources. | Inspection freq: Inspections can occur at any time, with facilities subject to surprise inspections twice a year | Reinspection: Follow-up within the week if violations found during inspection; facilities with two yellow placards in a row require food safety course attendance',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Contra Costa');

-- El Dorado County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Environmental Management Department - Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "El Dorado County conducts routine inspections and provides inspection reports, but specific grading methodology (letter grades, numerical scores, or pass/fail) could not be verified from available sources"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC) - California Health and Safety Code, Division 104, Part 7. El Dorado County conducts routine inspections and provides inspection reports, but specific grading methodology (letter grades, numerical scores, or pass/fail) could not be verified from available sources',
    violation_weight_map = '{"methodology_description": "El Dorado County conducts routine inspections and provides inspection reports, but specific grading methodology (letter grades, numerical scores, or pass/fail) could not be verified from available sources"}'::jsonb,
    fire_ahj_name = 'El Dorado County Fire Protection District and multiple local fire agencies including El Dorado Hills Fire Department',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.eldoradocounty.ca.gov/Public-Safety-Justice/Food-Safety/Inspection-Reports',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Manual verification needed for: 1) Specific grading system type and methodology, 2) Score ranges and grade thresholds if applicable, 3) Detailed inspection frequency schedules, 4) Risk-based categorization system if used. Contact Environmental Health Division at 530-621-5300 for definitive grading system information. | Inspection freq: Routine inspections of permitted food facilities conducted by Environmental Health Division | Reinspection: Food facility complaints and compliance issues trigger investigations and follow-up inspections',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('El Dorado');

-- Fresno County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Fresno County Department of Public Health - Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "No letter grading system identified - uses major/minor violation classification system only"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode). No letter grading system identified - uses major/minor violation classification system only',
    violation_weight_map = '{"methodology_description": "No letter grading system identified - uses major/minor violation classification system only"}'::jsonb,
    fire_ahj_name = 'Fresno County Fire Protection District',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.fresnohealthinspections.com/inspection-information',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Need to verify specific grading methodology if any exists beyond major/minor violation classification. Grand Jury report from 2023-2024 indicates system deficiencies and lack of letter grading, but should confirm current practices and any recent changes to inspection scoring methodology. | Inspection freq: Based on risk assessment and facility type - routine inspections conducted at unannounced intervals | Reinspection: Major violations require reinspection unless immediately corrected during routine inspection',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Fresno');

-- Glenn County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Glenn County Environmental Health Department - Planning & Community Development Services',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Glenn County does not appear to use a formal letter grading or numerical scoring system. They classify violations as Critical, Major, and Minor but no evidence found of A/B/C grades or numerical scores on inspection reports."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - part of California Health and Safety Code, effective July 1, 2007. Glenn County does not appear to use a formal letter grading or numerical scoring system. They classify violations as Critical, Major, and Minor but no evidence found of A/B/C grades or numerical scores on inspection reports.',
    violation_weight_map = '{"methodology_description": "Glenn County does not appear to use a formal letter grading or numerical scoring system. They classify violations as Critical, Major, and Minor but no evidence found of A/B/C grades or numerical scores on inspection reports."}'::jsonb,
    fire_ahj_name = 'Multiple fire protection districts serve Glenn County (Artois-Glenn, Orland, Hamilton City, Kanawha-Glenn, Ord, Glenn-Codora Fire Protection Districts)',
    fire_ahj_type = 'county_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.countyofglenn.net/government/departments/planning-community-development-services/environmental-health/food-safety',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Manual verification needed for: 1) Confirmation of no formal grading system vs. undisclosed grading system, 2) Specific inspection frequency schedules and risk-based criteria, 3) Which fire protection district has authority over commercial kitchen inspections and specific hood/suppression system requirements, 4) Any local ordinances beyond state food code requirements. | Inspection freq: Unknown - no specific frequency information found for Glenn County | Reinspection: Critical violations must be corrected at time of inspection and may require follow-up inspection. Re-inspection not usually required for minor violations only.',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Glenn');

-- Humboldt County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Humboldt County Department of Health and Human Services Division of Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Grading system not definitively identified in official sources - violations are categorized as Critical Risk Factors (1-24), Major Violations, and Minor Violations, but specific scoring/grading methodology not found"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - became effective July 1, 2007. Grading system not definitively identified in official sources - violations are categorized as Critical Risk Factors (1-24), Major Violations, and Minor Violations, but specific scoring/grading methodology not found',
    violation_weight_map = '{"methodology_description": "Grading system not definitively identified in official sources - violations are categorized as Critical Risk Factors (1-24), Major Violations, and Minor Violations, but specific scoring/grading methodology not found"}'::jsonb,
    fire_ahj_name = 'Local Fire Marshal/Authority Having Jurisdiction (AHJ)',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://humboldtgov.org/696/Retail-Food-Facility-Safety',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Requires manual verification of: 1) Specific grading system methodology (A/B/C grades vs numerical scoring), 2) Exact point deduction system if numerical, 3) Grade posting requirements, 4) Re-inspection triggers for poor grades, 5) Specific fire department inspection requirements for commercial kitchens in Humboldt County | Inspection freq: Risk-based inspections occurring 1-3 times per year depending on facility type - DEH performs 1,400-1,500 routine inspections annually | Reinspection: Non-routine inspections occur as needed, complaint-driven or at owner request',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Humboldt');

-- Imperial County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Imperial County Public Health Department - Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "Uses letter grades A, B, C based on numerical score (100-point system with deductions). Scores below 70 result in closure without grade issuance.", "letter_grades": ["A", "B", "C"], "score_range_min": 0, "score_range_max": 100, "passing_threshold": 70}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - Part of California Health and Safety Code. Uses letter grades A, B, C based on numerical score (100-point system with deductions). Scores below 70 result in closure without grade issuance.',
    violation_weight_map = '{"methodology_description": "Uses letter grades A, B, C based on numerical score (100-point system with deductions). Scores below 70 result in closure without grade issuance."}'::jsonb,
    pass_threshold = 70,
    warning_threshold = 75,
    critical_threshold = 70,
    fire_ahj_name = 'Imperial County Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.icphd.org/assets/Environmental-Health/Food/Food-Inspection-and-Grading-Guide-10.12-23.pdf',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Need to verify exact numerical score thresholds for A/B/C grades. The Imperial County inspection guide mentions the grading system but specific score ranges for each letter grade are not explicitly stated in the documents found. | Inspection freq: Routine inspections conducted by Environmental Health Specialists, with annual permit renewal required by December 31st | Reinspection: C grade facilities must request written re-inspection within 30 days or face closure. B grade facilities can request one re-score inspection per calendar year with fee.',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Imperial');

-- Inyo County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Inyo County Environmental Health Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Could not verify specific grading system used by Inyo County. California counties may use letter grades (A/B/C), numerical scores, or pass/fail systems, but Inyo County''s specific system was not found in official sources."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - California Health and Safety Code. Could not verify specific grading system used by Inyo County. California counties may use letter grades (A/B/C), numerical scores, or pass/fail systems, but Inyo County''s specific system was not found in official sources.',
    violation_weight_map = '{"methodology_description": "Could not verify specific grading system used by Inyo County. California counties may use letter grades (A/B/C), numerical scores, or pass/fail systems, but Inyo County''s specific system was not found in official sources."}'::jsonb,
    fire_ahj_name = 'Local fire departments - specific AHJ not identified',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.inyocounty.us/services/environmental-health',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Inyo County Environmental Health Department (760-878-0238) is recommended to verify: (1) specific grading system used (letter grades, numerical scores, or pass/fail), (2) inspection frequency and risk-based scheduling, (3) grade thresholds if applicable, (4) public posting requirements, and (5) local fire department inspection authority for commercial kitchen systems. | Inspection freq: Regular inspections conducted by Registered Environmental Health Specialists - specific frequency not verified | Reinspection: Not specified in available sources',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Inyo');

-- Kern County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Kern County Public Health Services Department, Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "100-point deduction system with letter grades (A/B/C) and closure below 75 points. Each inspection starts with 100 points and violations deduct points (major: 5 points, minor: 3 points, non-critical: 1 point).", "letter_grades": ["A", "B", "C"], "grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 75, "max": 79}}, "score_range_min": 0, "score_range_max": 100, "passing_threshold": 75}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC) based on FDA Food Code. 100-point deduction system with letter grades (A/B/C) and closure below 75 points. Each inspection starts with 100 points and violations deduct points (major: 5 points, minor: 3 points, non-critical: 1 point).',
    violation_weight_map = '{"grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 75, "max": 79}}, "methodology_description": "100-point deduction system with letter grades (A/B/C) and closure below 75 points. Each inspection starts with 100 points and violations deduct points (major: 5 points, minor: 3 points, non-critical: 1 point)."}'::jsonb,
    pass_threshold = 75,
    warning_threshold = 80,
    critical_threshold = 75,
    fire_ahj_name = 'Kern County Fire Department - Fire Prevention Division',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.kernpublichealth.com/permitting-compliance/food/restaurants-markets-kitchens',
    notes = 'JIE crawl: confidence=high(?) | All key aspects verified through official sources including the detailed NACCHO case study specifically examining Kern County''s food facility grading ordinance and official county websites. | Inspection freq: Risk-based: Low-risk 1x/year, medium-risk 2x/year, high-risk 3x/year | Reinspection: B and C grades can request rescore inspection; mandatory closure and reinspection for scores below 75',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Kern');

-- Kings County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Kings County Department of Public Health - Division of Environmental Health Services',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Kings County conducts routine food facility inspections and makes inspection reports publicly available, but specific grading methodology not verified from official sources"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (Part 7 of California Health and Safety Code). Kings County conducts routine food facility inspections and makes inspection reports publicly available, but specific grading methodology not verified from official sources',
    violation_weight_map = '{"methodology_description": "Kings County conducts routine food facility inspections and makes inspection reports publicly available, but specific grading methodology not verified from official sources"}'::jsonb,
    fire_ahj_name = 'Kings County Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.kcdph.com/ehsfoodinspectionreports',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Need to contact Kings County Division of Environmental Health Services directly at (559) 584-1411 to verify specific grading methodology, score ranges, and inspection frequency schedules. Fire department contact available at blake.adney@co.kings.ca.us for hood system requirements. | Inspection freq: All food and beverage facilities are inspected on a routine basis throughout the year | Reinspection: Investigations of complaints about food service operations and reported cases of foodborne illness',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Kings');

-- Lake County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Lake County Environmental Health Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "No specific grading system verified from official sources. Lake County Environmental Health provides inspection reports but grading methodology not found."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (part of California Health and Safety Code). No specific grading system verified from official sources. Lake County Environmental Health provides inspection reports but grading methodology not found.',
    violation_weight_map = '{"methodology_description": "No specific grading system verified from official sources. Lake County Environmental Health provides inspection reports but grading methodology not found."}'::jsonb,
    fire_ahj_name = 'Lake County Fire Protection District and local fire departments',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.lakecountyca.gov/338/Food-Safety',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Manual verification needed to confirm: 1) Whether Lake County uses any grading system (A/B/C, numerical scores, pass/fail), 2) Specific fire department requirements for commercial kitchen hood systems and suppression systems, 3) Exact inspection scoring methodology and public disclosure requirements. | Inspection freq: Risk-based: restaurants inspected at least 3 times per year, larger grocery stores 2-3 times annually, low-risk facilities less frequently, with everyone receiving at least one inspection per year | Reinspection: Major critical violations must be corrected and may require follow-up inspection',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Lake');

-- Lassen County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Lassen County Environmental Health Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Information about specific grading system not found on official website. County follows California Retail Food Code but specific grading methodology not publicly documented."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - California Health and Safety Code, effective July 1, 2007. Information about specific grading system not found on official website. County follows California Retail Food Code but specific grading methodology not publicly documented.',
    violation_weight_map = '{"methodology_description": "Information about specific grading system not found on official website. County follows California Retail Food Code but specific grading methodology not publicly documented."}'::jsonb,
    fire_ahj_name = 'Multiple fire departments - 33 Fire Departments serve Lassen County',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.lassencounty.org/dept/environmental-health/food-safety',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Lassen County Environmental Health Department needed to verify: 1) Specific grading system used (letter grades, numerical scores, or pass/fail), 2) Inspection frequency schedules and risk categorization, 3) Local ordinances beyond state requirements, 4) Specific fire department authority for commercial kitchens, 5) Fee schedules and permit requirements. Contact: ehe@co.lassen.ca.us or (530) 251-8373. | Inspection freq: Not specified on county website - likely risk-based per California standards | Reinspection: Critical violations must be corrected at time of inspection and may require follow-up inspection; re-inspection not usually required for minor violations only',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Lassen');

-- Los Angeles County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Los Angeles County Department of Public Health - Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "Uses letter grades A, B, C for scores 70% and above; facilities scoring below 70% receive numerical score cards instead of letter grades", "letter_grades": ["A", "B", "C"], "grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 70, "max": 79}}, "score_range_min": 0, "score_range_max": 100, "passing_threshold": 70}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC) - part of California Health and Safety Code. Uses letter grades A, B, C for scores 70% and above; facilities scoring below 70% receive numerical score cards instead of letter grades',
    violation_weight_map = '{"grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 70, "max": 79}}, "methodology_description": "Uses letter grades A, B, C for scores 70% and above; facilities scoring below 70% receive numerical score cards instead of letter grades"}'::jsonb,
    pass_threshold = 70,
    warning_threshold = 75,
    critical_threshold = 70,
    fire_ahj_name = 'Los Angeles County Fire Department and local fire authorities',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'http://publichealth.lacounty.gov/eh/inspection/grading-posting-requirements-retail-food-facilities.htm',
    notes = 'JIE crawl: confidence=high(?) | All key information verified from official Los Angeles County sources including specific ordinance text defining grading thresholds and inspection procedures. | Inspection freq: 1 to 3 times per year based on risk level - frequency determined by food products served, preparation methods, and operational history | Reinspection: Major Critical Risk Factor violations, facilities scoring below 70% twice in 12 months subject to closure',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Los Angeles');

-- Madera County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Madera County Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Grading system not definitively verified from official sources. California Retail Food Code compliance required but specific grading methodology not found."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode). Grading system not definitively verified from official sources. California Retail Food Code compliance required but specific grading methodology not found.',
    violation_weight_map = '{"methodology_description": "Grading system not definitively verified from official sources. California Retail Food Code compliance required but specific grading methodology not found."}'::jsonb,
    fire_ahj_name = 'Madera County Fire Division / Madera County Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.maderacounty.com/government/community-economic-development-department/divisions/environmental-health-division/food-safety-consumer-protection-program/food-program',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Madera County Environmental Health Division needed to verify: 1) Specific grading/scoring system used (A/B/C, numerical, pass/fail, or other), 2) Inspection frequency and risk-based scheduling, 3) Public disclosure requirements, 4) Specific fire department inspection procedures for commercial kitchen equipment | Inspection freq: Annual permits required (January 1 to December 31) | Reinspection: Not specified in available sources',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Madera');

-- Marin County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Community Development Agency - Environmental Health Services',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Marin County conducts food facility inspections but specific grading/scoring methodology not found in public sources"}'::jsonb,
    scoring_methodology = 'California Retail Food Code. Marin County conducts food facility inspections but specific grading/scoring methodology not found in public sources',
    violation_weight_map = '{"methodology_description": "Marin County conducts food facility inspections but specific grading/scoring methodology not found in public sources"}'::jsonb,
    fire_ahj_name = 'Southern Marin Fire Protection District and other local fire departments',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.marincounty.org/depts/cd/divisions/environmental-health-services/food-program',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Must verify specific grading system used by Marin County Environmental Health Services - whether they use letter grades (A/B/C), numerical scores (0-100), pass/fail, or another methodology. Also need to confirm specific inspection frequencies and risk categories used. | Inspection freq: Risk-based frequency as required by California Retail Food Code | Reinspection: Violations found during routine inspection or complaints',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Marin');

-- Mariposa County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Mariposa County Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Unable to verify the specific grading or scoring system used for food facility inspections"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC) - California Health and Safety Code Division 104, Part 7. Unable to verify the specific grading or scoring system used for food facility inspections',
    violation_weight_map = '{"methodology_description": "Unable to verify the specific grading or scoring system used for food facility inspections"}'::jsonb,
    fire_ahj_name = 'Mariposa County Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.mariposacounty.org/235/Environmental-Health',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Need to contact Mariposa County Environmental Health Division directly to determine specific grading methodology, inspection scoring system, risk categorization details, and whether inspection results are published online. | Inspection freq: Risk-based inspections with B&B facilities serving full breakfast requiring at least twice annually | Reinspection: Not specified in available documentation',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Mariposa');

-- Mendocino County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Mendocino County Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Unable to verify specific grading system details from official sources"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - California Health and Safety Code Division 104, Part 7. Unable to verify specific grading system details from official sources',
    violation_weight_map = '{"methodology_description": "Unable to verify specific grading system details from official sources"}'::jsonb,
    fire_ahj_name = 'Unable to verify specific fire department authority from sources',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.mendocinocounty.gov/departments/public-health/environmental-health',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Requires direct contact with Mendocino County Environmental Health Division at enviroh@mendocinocounty.gov or (707) 234-6636 to verify specific grading system, inspection frequency schedules, and detailed permit requirements. Official inspection database exists but grading methodology not publicly documented. | Inspection freq: Unable to verify specific inspection frequency from official sources | Reinspection: Unknown',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Mendocino');

-- Merced County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Merced County Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "other", "description": "Point-based system with good/satisfactory/unsatisfactory ratings", "grade_thresholds": {"Good": {"min": null, "max": 6}, "Satisfactory": {"min": 7, "max": 13}, "Unsatisfactory": {"min": 14, "max": null}}}'::jsonb,
    scoring_methodology = 'California Health and Safety Code Division 104 Part 7 (California Retail Food Code). Point-based system with good/satisfactory/unsatisfactory ratings',
    violation_weight_map = '{"grade_thresholds": {"Good": {"min": null, "max": 6}, "Satisfactory": {"min": 7, "max": 13}, "Unsatisfactory": {"min": 14, "max": null}}, "methodology_description": "Point-based system with good/satisfactory/unsatisfactory ratings"}'::jsonb,
    pass_threshold = 7,
    warning_threshold = 12,
    critical_threshold = 7,
    fire_ahj_name = 'Merced County Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.countyofmerced.com/1637/Food-Protection-and-Inspection',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Should verify exact inspection frequency schedule and confirm if there are numerical score ranges associated with the good/satisfactory/unsatisfactory ratings. Fire safety inspection requirements confirmed but frequency should be verified with county fire marshal. | Inspection freq: Routine inspections conducted, frequency not specified | Reinspection: Unsatisfactory ratings require follow-up inspection',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Merced');

-- Modoc County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Modoc County Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Cannot verify specific grading methodology. County issues written inspection reports and Permits to Operate for facilities meeting minimum state requirements but specific grading system not documented."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - State retail food laws. Cannot verify specific grading methodology. County issues written inspection reports and Permits to Operate for facilities meeting minimum state requirements but specific grading system not documented.',
    violation_weight_map = '{"methodology_description": "Cannot verify specific grading methodology. County issues written inspection reports and Permits to Operate for facilities meeting minimum state requirements but specific grading system not documented."}'::jsonb,
    fire_ahj_name = 'Unknown - information not found',
    fire_ahj_type = 'county_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://environmentalhealth.co.modoc.ca.us/nav/food_sanitation_program.php',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Modoc County Environmental Health required to verify: 1) Specific grading/scoring system used 2) Inspection frequency schedule 3) Fire department contact and commercial kitchen fire safety requirements 4) Specific local ordinances beyond state code 5) Risk-based inspection categories | Inspection freq: Routine inspections and complaint-based inspections | Reinspection: Complaint basis or routine schedule - specific triggers not documented',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Modoc');

-- Mono County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Mono County Environmental Health Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Mono County follows California Retail Food Code requirements but specific grading system not publicly detailed on county website"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - portion of California Health and Safety Code. Mono County follows California Retail Food Code requirements but specific grading system not publicly detailed on county website',
    violation_weight_map = '{"methodology_description": "Mono County follows California Retail Food Code requirements but specific grading system not publicly detailed on county website"}'::jsonb,
    fire_ahj_name = 'Local fire department/authority having jurisdiction - specific department not identified',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://monocounty.ca.gov/environmental-health/page/food',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Mono County Environmental Health Department (760) 924-1830 needed to verify: 1) Specific grading/scoring system used, 2) Inspection frequency by risk category, 3) Fire department jurisdiction for commercial kitchen systems, 4) Public posting requirements for inspection results, 5) Any local ordinances beyond CalCode | Inspection freq: Based on risk assessment - routine inspections conducted at unannounced intervals | Reinspection: Violations requiring correction or follow-up verification',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Mono');

-- Monterey County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Monterey County Health Department Environmental Health Bureau',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "other", "description": "Gold Seal program - voluntary evaluation system rather than traditional grading. Facilities achieving substantial compliance with California food safety standards receive a Gold Seal recognition. Unlike other counties, Monterey County does not use letter grades (A/B/C) or numerical scores."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - state implementation of food safety requirements. Gold Seal program - voluntary evaluation system rather than traditional grading. Facilities achieving substantial compliance with California food safety standards receive a Gold Seal recognition. Unlike other counties, Monterey County does not use letter grades (A/B/C) or numerical scores.',
    violation_weight_map = '{"methodology_description": "Gold Seal program - voluntary evaluation system rather than traditional grading. Facilities achieving substantial compliance with California food safety standards receive a Gold Seal recognition. Unlike other counties, Monterey County does not use letter grades (A/B/C) or numerical scores."}'::jsonb,
    fire_ahj_name = 'Monterey County Regional Fire Protection District (for unincorporated areas) and local city fire departments (for incorporated cities)',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.countyofmonterey.gov/government/departments-a-h/health/environmental-health/consumer-health-protection/food/gold-seal-program',
    notes = 'JIE crawl: confidence=high(?) | System verified through official county websites, news articles with inspector quotes, and consistent information across multiple sources. The Gold Seal program is clearly documented as Monterey County''s unique approach instead of traditional A/B/C grading used by other California counties. | Inspection freq: Regular routine inspections conducted by Registered Environmental Health Specialists. Mobile food facilities inspected twice yearly at designated times and locations. | Reinspection: Complaint investigations, follow-up inspections for violations, permit inspections may be scheduled in advance',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Monterey');

-- Nevada County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Nevada County Environmental Health Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "No specific grading or scoring system details found on official Nevada County websites. System type could not be verified."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC). No specific grading or scoring system details found on official Nevada County websites. System type could not be verified.',
    violation_weight_map = '{"methodology_description": "No specific grading or scoring system details found on official Nevada County websites. System type could not be verified."}'::jsonb,
    fire_ahj_name = 'Unknown - specific fire authority not identified for Nevada County commercial kitchen inspections',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.nevadacountyca.gov/1470/Environmental-Health',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Nevada County Environmental Health Department at (530) 265-1222 Option 3 is needed to verify: 1) Specific grading/scoring system used 2) Inspection frequency and risk-based scheduling 3) Fire safety inspection authority for commercial kitchens 4) Public disclosure requirements 5) Local ordinances beyond California Retail Food Code | Inspection freq: Unknown - no specific frequency information found on official sources | Reinspection: Unknown - specific reinspection criteria not found',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Nevada');

-- Orange County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Orange County Health Care Agency - Environmental Health Division',
    scoring_type = 'pass_fail',
    grading_type = 'pass_fail',
    grading_config = '{"crawl_type": "pass_fail", "description": "Orange County uses a pass/fail placard system instead of letter grades. Facilities receive Pass, Reinspection Due-Pass, or Closed placards."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - part of California Health and Safety Code, based on FDA Food Code. Orange County uses a pass/fail placard system instead of letter grades. Facilities receive Pass, Reinspection Due-Pass, or Closed placards.',
    violation_weight_map = '{"methodology_description": "Orange County uses a pass/fail placard system instead of letter grades. Facilities receive Pass, Reinspection Due-Pass, or Closed placards."}'::jsonb,
    fire_ahj_name = 'Orange County Fire Authority (OCFA) and local fire departments',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://ochealthinfo.com/about-hca/public-health-services/environmental-health-division/food/food-facility-health-permit',
    notes = 'JIE crawl: confidence=high(?) | Orange County is definitively confirmed to use pass/fail placards rather than letter grades. The county has approximately 15,000 food facilities under California Retail Food Code enforcement. | Inspection freq: Risk-based routine inspections based on facility type and risk category identification | Reinspection: Major violations observed and corrected require follow-up inspection on date posted on seal',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Orange');

-- Placer County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Placer County Environmental Health Division',
    scoring_type = 'pass_fail',
    grading_type = 'pass_fail',
    grading_config = '{"crawl_type": "pass_fail", "description": "Placer County uses a color-coded placard system rather than letter grades or numerical scores. Green = Pass (no major violations), Yellow = Conditional Pass (major violations present), Red = Closed (imminent health hazards)"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - California Health and Safety Code Section 113700 et seq.. Placer County uses a color-coded placard system rather than letter grades or numerical scores. Green = Pass (no major violations), Yellow = Conditional Pass (major violations present), Red = Closed (imminent health hazards)',
    violation_weight_map = '{"methodology_description": "Placer County uses a color-coded placard system rather than letter grades or numerical scores. Green = Pass (no major violations), Yellow = Conditional Pass (major violations present), Red = Closed (imminent health hazards)"}'::jsonb,
    fire_ahj_name = 'Local Fire Department (varies by jurisdiction within county)',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.placer.ca.gov/3337/Food-Protection-Program',
    notes = 'JIE crawl: confidence=high(?) | All key information verified from official county sources. Placer County uses color-coded placards (Green/Yellow/Red) rather than letter grades or numerical scores, which is clearly documented in their ordinance and website materials. | Inspection freq: Periodic, unannounced inspections by assigned Environmental Health Specialists - specific risk-based frequency not specified in available sources | Reinspection: Major violations remaining uncorrected after routine inspection, failure to comply with compliance agreement, or imminent health hazards requiring closure',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Placer');

-- Plumas County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Plumas County Environmental Health Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "No grading system details found in official sources - unable to verify if letter grades, numerical scores, or pass/fail system is used"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (Cal Code), effective January 2019. No grading system details found in official sources - unable to verify if letter grades, numerical scores, or pass/fail system is used',
    violation_weight_map = '{"methodology_description": "No grading system details found in official sources - unable to verify if letter grades, numerical scores, or pass/fail system is used"}'::jsonb,
    fire_ahj_name = 'Multiple local Fire Protection Districts and Community Service Districts - 14 total agencies',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.plumascounty.us/275/Food-Safety',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Plumas County Environmental Health at (530) 283-6355 needed to verify: 1) Specific grading/scoring system used 2) Letter grades vs numerical scores vs pass/fail 3) Inspection report posting requirements 4) Which specific fire districts have authority over commercial kitchen inspections 5) Local ordinances beyond state code | Inspection freq: Minimum of two (2) times a year for routine inspection | Reinspection: Serious violations trigger re-inspection date setup',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Plumas');

-- Riverside County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Riverside County Department of Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "letter_grade", "description": "Uses letter grades A, B, C based on percentage scores with required re-inspection for B or C grades", "letter_grades": ["A", "B", "C"], "grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 0, "max": 79}}, "score_range_min": 0, "score_range_max": 100, "passing_threshold": 80}'::jsonb,
    scoring_methodology = 'California Health and Safety Code (CalCode) and California Retail Food Code. Uses letter grades A, B, C based on percentage scores with required re-inspection for B or C grades',
    violation_weight_map = '{"grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 0, "max": 79}}, "methodology_description": "Uses letter grades A, B, C based on percentage scores with required re-inspection for B or C grades"}'::jsonb,
    pass_threshold = 80,
    warning_threshold = 85,
    critical_threshold = 80,
    fire_ahj_name = 'Riverside County Fire Department, Office of the Fire Marshal',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://rivcoeh.org/foods',
    notes = 'JIE crawl: confidence=high(?) | All key information verified from official Riverside County Department of Environmental Health and Fire Department sources. Grading thresholds confirmed: A (90-100%), B (80-89%), C (79% and below). | Inspection freq: 2-3 routine inspections annually for most facilities, with high-risk facilities inspected more frequently | Reinspection: Grade B or C requires correction of all violations and re-inspection within a week to achieve Grade A',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Riverside');

-- Sacramento County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Sacramento County Environmental Management Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "other", "description": "Green-Yellow-Red (GYR) Color-Coded Placard System - Green (Pass), Yellow (Conditional Pass requiring 24-72 hour re-inspection), Red (Closed)"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (California Health and Safety Code Division 104, Part 7). Green-Yellow-Red (GYR) Color-Coded Placard System - Green (Pass), Yellow (Conditional Pass requiring 24-72 hour re-inspection), Red (Closed)',
    violation_weight_map = '{"methodology_description": "Green-Yellow-Red (GYR) Color-Coded Placard System - Green (Pass), Yellow (Conditional Pass requiring 24-72 hour re-inspection), Red (Closed)"}'::jsonb,
    fire_ahj_name = 'Local fire departments (varies by city within Sacramento County)',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://emd.saccounty.gov/EH/FoodProtect-RetailFood/Pages/default.aspx',
    notes = 'JIE crawl: confidence=high(?) | All information confirmed from official county sources. Fire safety inspection requirements confirmed as NFPA standards enforced by local fire departments with 6-month inspection cycles for commercial kitchen suppression systems. | Inspection freq: Food preparation facilities inspected approximately 3 times per year; retail markets inspected 2 times per year | Reinspection: Yellow placard requires follow-up inspection within 24-72 hours; major violations require re-inspection unless corrected during inspection',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Sacramento');

-- San Benito County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'San Benito County Health and Human Services Agency - Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Unable to verify specific grading system from available sources"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC). Unable to verify specific grading system from available sources',
    violation_weight_map = '{"methodology_description": "Unable to verify specific grading system from available sources"}'::jsonb,
    fire_ahj_name = 'Unknown - likely San Benito County Fire Department or local fire districts',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://hhsa.sanbenitocountyca.gov/environmental-health-2-2/',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Requires direct contact with San Benito County Environmental Health Department to verify inspection grading system, frequency, and procedures. Website lacks detailed information about food facility inspection protocols and scoring systems. | Inspection freq: Unknown - not specified in available documents | Reinspection: Unknown',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('San Benito');

-- San Bernardino County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'San Bernardino County Department of Public Health, Division of Environmental Health Services',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "Uses both numerical scores (0-100) and letter grades (A/B/C). Points are subtracted from 100 based on violations. Critical violations deduct 4 points, minor violations deduct 1-3 points.", "letter_grades": ["A", "B", "C"], "grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 70, "max": 79}}, "score_range_min": 0, "score_range_max": 100, "passing_threshold": 70}'::jsonb,
    scoring_methodology = 'California Retail Food Code (Cal Code) - part of California Health & Safety Code, modeled after FDA Food Code. Uses both numerical scores (0-100) and letter grades (A/B/C). Points are subtracted from 100 based on violations. Critical violations deduct 4 points, minor violations deduct 1-3 points.',
    violation_weight_map = '{"grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 70, "max": 79}}, "methodology_description": "Uses both numerical scores (0-100) and letter grades (A/B/C). Points are subtracted from 100 based on violations. Critical violations deduct 4 points, minor violations deduct 1-3 points."}'::jsonb,
    pass_threshold = 70,
    warning_threshold = 75,
    critical_threshold = 70,
    fire_ahj_name = 'San Bernardino County Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://ehs.sbcounty.gov/programs/food-facilities/',
    notes = 'JIE crawl: confidence=high(?) | All key information verified from official San Bernardino County sources including EHS website, inspection guides, county fire department, and local news coverage of inspection results. | Inspection freq: Two yearly inspections for permitted facilities, with risk-based scheduling for high-risk facilities | Reinspection: C grade (70-79) requires mandatory follow-up inspection. Facilities scoring below 70 are temporarily closed. High-risk facilities include those with C grades, multiple B grades, or repeated 4-point vi',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('San Bernardino');

-- San Diego County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'County of San Diego Department of Environmental Health and Quality - Food and Housing Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "San Diego County uses a numerical scoring system (0-100) that converts to letter grades. Points are subtracted from a base score of 100 for violations: Major Risk Factors (4 points), Minor Risk Factors (2 points), and Good Retail Practices (1 point).", "letter_grades": ["A", "B", "C"], "grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 0, "max": 79}}, "score_range_min": 0, "score_range_max": 100, "passing_threshold": 70}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - California Health and Safety Code Part 7, Division 104, Sections 113700 et seq.. San Diego County uses a numerical scoring system (0-100) that converts to letter grades. Points are subtracted from a base score of 100 for violations: Major Risk Factors (4 points), Minor Risk Factors (2 points), and Good Retail Practices (1 point).',
    violation_weight_map = '{"grade_thresholds": {"A": {"min": 90, "max": 100}, "B": {"min": 80, "max": 89}, "C": {"min": 0, "max": 79}}, "methodology_description": "San Diego County uses a numerical scoring system (0-100) that converts to letter grades. Points are subtracted from a base score of 100 for violations: Major Risk Factors (4 points), Minor Risk Factors (2 points), and Good Retail Practices (1 point)."}'::jsonb,
    pass_threshold = 70,
    warning_threshold = 75,
    critical_threshold = 70,
    fire_ahj_name = 'San Diego County Fire Marshal Program (for unincorporated areas) / City Fire Departments (for incorporated cities)',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/food.html',
    notes = 'JIE crawl: confidence=high(?) | All key information verified from official county sources. Fire safety inspection requirements confirmed from NFPA standards and local fire protection service providers. | Inspection freq: Risk-based routine inspections, typically 1-3 per year. Approximately 32,000+ inspections conducted annually across 14,000+ facilities. | Reinspection: Any facility not receiving an ''A'' grade on routine inspection is re-inspected. Facilities with scores below 70 or certain major violations result in automatic closure until compliance.',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('San Diego');

-- San Francisco (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'San Francisco Department of Public Health - Environmental Health Branch',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "San Francisco uses both numerical scores (1-100) and color-coded placards. Facilities receive numerical scores based on point deductions for violations, but display color-coded placards (green, yellow, red) based on major violations rather than score ranges.", "score_range_min": 1, "score_range_max": 100}'::jsonb,
    scoring_methodology = 'California Retail Food Code (Health and Safety Code Division 104, Part 7). San Francisco uses both numerical scores (1-100) and color-coded placards. Facilities receive numerical scores based on point deductions for violations, but display color-coded placards (green, yellow, red) based on major violations rather than score ranges.',
    violation_weight_map = '{"methodology_description": "San Francisco uses both numerical scores (1-100) and color-coded placards. Facilities receive numerical scores based on point deductions for violations, but display color-coded placards (green, yellow, red) based on major violations rather than score ranges."}'::jsonb,
    fire_ahj_name = 'San Francisco Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.sfdph.org/dph/EH/default.asp',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Need to clarify exact relationship between numerical scores and placard colors, as sources show conflicting information about whether placards are based on score ranges or solely on major violation counts. Fire department inspection requirements clearly documented. | Inspection freq: Risk-based: High-risk facilities like full-service restaurants inspected up to 3 times annually, lower-risk operations 1-3 times per year | Reinspection: Yellow placard facilities may receive reinspection within 3 business days; red placard facilities closed until violations corrected',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('San Francisco');

-- San Joaquin County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'San Joaquin County Environmental Health Department',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Unable to verify specific grading system methodology - county uses California Retail Food Code for inspections but grading details not specified"}'::jsonb,
    scoring_methodology = 'California Health and Safety Code Division 104, Part 7 - California Retail Food Code (CalCode). Unable to verify specific grading system methodology - county uses California Retail Food Code for inspections but grading details not specified',
    violation_weight_map = '{"methodology_description": "Unable to verify specific grading system methodology - county uses California Retail Food Code for inspections but grading details not specified"}'::jsonb,
    fire_ahj_name = 'Not specified - appears to involve Environmental Health Dept for plan review',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://sjcehd.com/',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Need to contact San Joaquin County Environmental Health Department directly at (209) 468-3420 to verify grading system methodology, inspection frequency schedules, and specific fire safety inspection authorities. Restaurant inspection portal exists but grading system details not accessible in search results. | Inspection freq: Routine inspections conducted, frequency not specified in verified sources | Reinspection: Not specified in available sources',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('San Joaquin');

-- San Luis Obispo County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'County of San Luis Obispo Health Agency Environmental Health Services Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'score_only',
    grading_config = '{"crawl_type": "numerical_score", "description": "As of May 5, 2025, uses a negative scoring scale starting from zero with points deducted for violations. Previously used 100-point system (max 100 points) with deductions for violations.", "score_range_min": -100, "score_range_max": 0}'::jsonb,
    scoring_methodology = 'California Retail Food Code (California Health and Safety Code §113700-114437). As of May 5, 2025, uses a negative scoring scale starting from zero with points deducted for violations. Previously used 100-point system (max 100 points) with deductions for violations.',
    violation_weight_map = '{"methodology_description": "As of May 5, 2025, uses a negative scoring scale starting from zero with points deducted for violations. Previously used 100-point system (max 100 points) with deductions for violations."}'::jsonb,
    fire_ahj_name = 'CAL FIRE San Luis Obispo County Fire Department',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.slocounty.ca.gov/departments/health-agency/public-health/environmental-health-services/all-environmental-health-services/food-facilities-and-operations/food-facility-inspection-results',
    notes = 'JIE crawl: confidence=high(?) | All key information confirmed from official sources. Note that San Luis Obispo County recently transitioned to a new negative scoring system effective May 5, 2025, replacing their previous 100-point system. | Inspection freq: Annual health permit includes one routine inspection and one reinspection | Reinspection: Follow up inspections conducted when health inspector determines during regular inspection that compliance verification is required',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('San Luis Obispo');

-- San Mateo County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'San Mateo County Environmental Health Services',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "Color-coded placard system (Green/Yellow/Red) based on CDC risk factors, plus numerical scoring from 0-100 with point deductions for violations", "grade_thresholds": {"Green": {"description": "Pass - No more than one major violation corrected during inspection"}, "Yellow": {"description": "Conditional Pass - Two or more major violations corrected during inspection"}, "Red": {"description": "Closure - Major violations pose imminent health hazard"}}, "score_range_min": 0, "score_range_max": 100}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC), Division 104, Part 7 of CA Health and Safety Code. Color-coded placard system (Green/Yellow/Red) based on CDC risk factors, plus numerical scoring from 0-100 with point deductions for violations',
    violation_weight_map = '{"grade_thresholds": {"Green": {"description": "Pass - No more than one major violation corrected during inspection"}, "Yellow": {"description": "Conditional Pass - Two or more major violations corrected during inspection"}, "Red": {"description": "Closure - Major violations pose imminent health hazard"}}, "methodology_description": "Color-coded placard system (Green/Yellow/Red) based on CDC risk factors, plus numerical scoring from 0-100 with point deductions for violations"}'::jsonb,
    fire_ahj_name = 'San Mateo County Fire Department - Fire Marshal''s Office',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.smchealth.org/food-safety',
    notes = 'JIE crawl: confidence=high(?) | All key information verified from official county sources. The hybrid grading system uses both color-coded placards (Green/Yellow/Red) based on CDC critical risk factors and numerical scores (0-100) with point deductions for violations (Major: 8 points, Moderate: 3 points, Minor: 2 points). | Inspection freq: Risk-based: Category 1 (1x/year), Category 2 (2x/year), Category 3 (3x/year) | Reinspection: Conditional pass (yellow placard) may require reinspection within 3 business days; closure (red placard) requires correction and reinspection',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('San Mateo');

-- Santa Clara County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Santa Clara County Department of Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "Green-Yellow-Red color-coded placard system separate from numerical compliance scores. Placards based on major violations, scores based on all violations.", "grade_thresholds": {"Green": {"description": "PASS - No more than one major violation corrected during inspection"}, "Yellow": {"description": "CONDITIONAL PASS - Two or more major violations corrected during inspection"}, "Red": {"description": "CLOSURE - Imminent threat to health, violations not corrected"}}, "score_range_min": 0, "score_range_max": 100}'::jsonb,
    scoring_methodology = 'California Retail Food Code, Health and Safety Code Division 104, Part 7. Green-Yellow-Red color-coded placard system separate from numerical compliance scores. Placards based on major violations, scores based on all violations.',
    violation_weight_map = '{"grade_thresholds": {"Green": {"description": "PASS - No more than one major violation corrected during inspection"}, "Yellow": {"description": "CONDITIONAL PASS - Two or more major violations corrected during inspection"}, "Red": {"description": "CLOSURE - Imminent threat to health, violations not corrected"}}, "methodology_description": "Green-Yellow-Red color-coded placard system separate from numerical compliance scores. Placards based on major violations, scores based on all violations."}'::jsonb,
    fire_ahj_name = 'Santa Clara County Fire Marshal''s Office (operated by Santa Clara County Fire Department)',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://deh.santaclaracounty.gov/food-and-retail/compliance-retail-food-operations/food-facility-placarding-and-scoring-program',
    notes = 'JIE crawl: confidence=high(?) | System well-documented with clear explanations of hybrid placard/scoring methodology, violation categories with point deductions (Major: 8 points, Moderate: 3 points, Minor: 2 points), and fire safety inspection requirements for commercial kitchens. | Inspection freq: Typically twice per year for restaurants, varies by facility type and risk factors | Reinspection: Yellow placard facilities may receive reinspection within 3 business days to ensure major violations remain corrected',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Santa Clara');

-- Santa Cruz County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Santa Cruz County Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'letter_grade',
    grading_config = '{"crawl_type": "hybrid", "description": "Santa Cruz County uses a hybrid system with both colored placards (Green/Yellow/Red) based on major violations AND numerical scores from 0-100 calculated by deducting points for violations", "grade_thresholds": {"GREEN": {"description": "PASS - No more than one major violation observed and corrected during inspection"}, "YELLOW": {"description": "CONDITIONAL PASS - Two or more major violations observed but corrected during inspection"}, "RED": {"description": "CLOSURE - Facility closed due to imminent threat to health and safety"}}, "score_range_min": 0, "score_range_max": 100}'::jsonb,
    scoring_methodology = 'California Retail Food Code (Part 7 of Division 104 of California Health and Safety Code). Santa Cruz County uses a hybrid system with both colored placards (Green/Yellow/Red) based on major violations AND numerical scores from 0-100 calculated by deducting points for violations',
    violation_weight_map = '{"grade_thresholds": {"GREEN": {"description": "PASS - No more than one major violation observed and corrected during inspection"}, "YELLOW": {"description": "CONDITIONAL PASS - Two or more major violations observed but corrected during inspection"}, "RED": {"description": "CLOSURE - Facility closed due to imminent threat to health and safety"}}, "methodology_description": "Santa Cruz County uses a hybrid system with both colored placards (Green/Yellow/Red) based on major violations AND numerical scores from 0-100 calculated by deducting points for violations"}'::jsonb,
    fire_ahj_name = 'Santa Cruz County Fire Department and independent Fire Districts',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://scceh.com/NewHome/Programs/ConsumerProtection/Food/AboutRestaurantInspections.aspx',
    notes = 'JIE crawl: confidence=high(?) | All key information confirmed through official county sources. Fire safety requirements verified through County Fire Code. Placard system and scoring methodology clearly defined in official documentation. | Inspection freq: Two to four times per year depending on the type of facility | Reinspection: Yellow placards may trigger reinspection within 3 business days to ensure major violations remain permanently corrected',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Santa Cruz');

-- Shasta County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Shasta County Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Grading system not specified in available documentation. County has online inspection results but no grading methodology detailed."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (Cal Code). Grading system not specified in available documentation. County has online inspection results but no grading methodology detailed.',
    violation_weight_map = '{"methodology_description": "Grading system not specified in available documentation. County has online inspection results but no grading methodology detailed."}'::jsonb,
    fire_ahj_name = 'Unknown - not specified in available sources',
    fire_ahj_type = 'county_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.shastacounty.gov/environmental-health',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Need to verify: 1) Specific grading system used (letter grades, numerical scores, or pass/fail), 2) Fire department authority and commercial kitchen fire suppression inspection requirements, 3) Specific risk categories and inspection frequencies, 4) Grade posting/display requirements | Inspection freq: Multiple times per year based on facility risk assessment | Reinspection: Violations requiring correction',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Shasta');

-- Sierra County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Sierra County Department of Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "No specific grading system information found on official websites"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (part of CA Health and Safety Code Division 104, Part 7). No specific grading system information found on official websites',
    violation_weight_map = '{"methodology_description": "No specific grading system information found on official websites"}'::jsonb,
    fire_ahj_name = 'Unknown - specific fire authority not identified',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.sierracounty.ca.gov/231/Environmental-Health',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Sierra County Environmental Health Department at 530-993-6716 needed to verify: (1) specific grading/scoring system used if any, (2) inspection frequency protocols, (3) fire department authority for hood systems, (4) any local ordinances beyond state requirements. The county website provides minimal operational details about their food inspection program. | Inspection freq: Unknown - specific frequency not documented on official site | Reinspection: Unknown',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Sierra');

-- Siskiyou County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Siskiyou County Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Siskiyou County conducts routine food facility inspections but does not appear to use a letter grading or numerical scoring system for public display. California law does not require counties to use grading systems - some counties inform the public through different methods."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - California Health and Safety Code beginning with section 113700. Siskiyou County conducts routine food facility inspections but does not appear to use a letter grading or numerical scoring system for public display. California law does not require counties to use grading systems - some counties inform the public through different methods.',
    violation_weight_map = '{"methodology_description": "Siskiyou County conducts routine food facility inspections but does not appear to use a letter grading or numerical scoring system for public display. California law does not require counties to use grading systems - some counties inform the public through different methods."}'::jsonb,
    fire_ahj_name = 'Not specified - likely local fire authority or CAL FIRE',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.siskiyoucounty.gov/environmentalhealth/facility-inspection-reports',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Siskiyou County Environmental Health Division (530-841-2100) is recommended to verify: 1) Specific grading or scoring methodology if any, 2) Risk-based inspection frequency categories, 3) Local fire authority for hood system inspections, 4) Any local ordinances beyond state CalCode, 5) Specific permit requirements and fee structure. | Inspection freq: Routine unannounced inspections conducted by Registered Environmental Health Specialists (REHS) | Reinspection: Violations noted during routine inspections require follow-up verification',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Siskiyou');

-- Solano County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Solano County Department of Resource Management - Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Cannot definitively verify grading system type - no clear evidence of letter grades, numerical scores, or pass/fail system found on official county sources. California counties have varying systems, but Solano County''s specific methodology is not clearly documented in available resources."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode). Cannot definitively verify grading system type - no clear evidence of letter grades, numerical scores, or pass/fail system found on official county sources. California counties have varying systems, but Solano County''s specific methodology is not clearly documented in available resources.',
    violation_weight_map = '{"methodology_description": "Cannot definitively verify grading system type - no clear evidence of letter grades, numerical scores, or pass/fail system found on official county sources. California counties have varying systems, but Solano County''s specific methodology is not clearly documented in available resources."}'::jsonb,
    fire_ahj_name = 'Not specifically identified - likely local fire departments within Solano County cities',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.solanocounty.gov/government/resource-management/environmental-health',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Recommend direct contact with Solano County Environmental Health Division at (707) 784-6765 to verify: 1) Specific grading system methodology, 2) Whether they use letter grades, numerical scores, or pass/fail, 3) Public posting requirements for grades/scores, 4) Current online inspection report access system. County appears to have inspection results available but grading system details not published online. | Inspection freq: Risk-based inspection program with annual routine inspections per state statute | Reinspection: Complaint investigations or suspected health hazards',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Solano');

-- Sonoma County (CA) — confidence: high(?)
UPDATE jurisdictions
SET
    agency_name = 'Sonoma County Department of Health Services, Environmental Health & Safety Section',
    scoring_type = 'pass_fail',
    grading_type = 'pass_fail',
    grading_config = '{"crawl_type": "pass_fail", "description": "Color-coded placard system implemented June 1, 2016. Green for Pass (no more than 1 major violation correctable during inspection), Yellow for Conditional Pass (2+ major violations), Red for Closed (immediate health threat)."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - Part of California Health and Safety Code, based on FDA Food Code. Color-coded placard system implemented June 1, 2016. Green for Pass (no more than 1 major violation correctable during inspection), Yellow for Conditional Pass (2+ major violations), Red for Closed (immediate health threat).',
    violation_weight_map = '{"methodology_description": "Color-coded placard system implemented June 1, 2016. Green for Pass (no more than 1 major violation correctable during inspection), Yellow for Conditional Pass (2+ major violations), Red for Closed (immediate health threat)."}'::jsonb,
    fire_ahj_name = 'Permit Sonoma Fire Prevention and Hazardous Materials Division',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://sonomacounty.gov/health-and-human-services/health-services/divisions/public-health/environmental-health/programs-and-services/food-safety-program/food-facility-inspections',
    notes = 'JIE crawl: confidence=high(?) | All key information verified from official county sources. CalCode basis confirmed. Fire safety requirements follow standard NFPA protocols. | Inspection freq: All food facilities inspected once or twice per year. Facilities with moderate/extensive food prep inspected twice yearly, minimal prep once yearly. | Reinspection: Yellow or red placards require follow-up inspection. Major violations and permit suspensions trigger reinspections.',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Sonoma');

-- Stanislaus County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Stanislaus County Department of Environmental Resources - Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Grading system methodology not found in official sources. Inspections are documented with violation reports but no specific letter grades, numerical scores, or pass/fail thresholds were identified."}'::jsonb,
    scoring_methodology = 'California Retail Food Code. Grading system methodology not found in official sources. Inspections are documented with violation reports but no specific letter grades, numerical scores, or pass/fail thresholds were identified.',
    violation_weight_map = '{"methodology_description": "Grading system methodology not found in official sources. Inspections are documented with violation reports but no specific letter grades, numerical scores, or pass/fail thresholds were identified."}'::jsonb,
    fire_ahj_name = 'Stanislaus County Fire Prevention Bureau',
    fire_ahj_type = 'county_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.stancounty.com/er/environmentalhealth/food-program.shtm',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Need to verify specific grading methodology if any exists beyond violation-based reporting. Should confirm inspection frequency for different risk categories and detailed fire safety inspection requirements for commercial kitchens. | Inspection freq: The majority of the 2,400 permitted food service establishments receive two unannounced routine food safety inspections per year | Reinspection: Facilities with three or more violations or major violations are subject to reinspection',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Stanislaus');

-- Sutter County (CA) — confidence: medium(?)
UPDATE jurisdictions
SET
    agency_name = 'Sutter County Development Services Department - Environmental Health Division',
    scoring_type = 'major_violation_count',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "other", "description": "Color-coded placard system with Green (Pass), Yellow (Conditional Pass), and Red (Closure) placards based on CDC critical risk factors and major violations. No letter grades or numerical scores assigned by the county."}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CRFC) - part of California Health and Safety Code. Color-coded placard system with Green (Pass), Yellow (Conditional Pass), and Red (Closure) placards based on CDC critical risk factors and major violations. No letter grades or numerical scores assigned by the county.',
    violation_weight_map = '{"methodology_description": "Color-coded placard system with Green (Pass), Yellow (Conditional Pass), and Red (Closure) placards based on CDC critical risk factors and major violations. No letter grades or numerical scores assigned by the county."}'::jsonb,
    fire_ahj_name = 'Sutter County Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.suttercounty.org/government/county-departments/development-services/environmental-health',
    notes = 'JIE crawl: confidence=medium(?) | NEEDS MANUAL VERIFICATION | Need to verify: 1) Specific fire department hood/suppression system inspection requirements and frequency, 2) Detailed inspection scheduling and risk-based frequency, 3) Local ordinances beyond state code, 4) Complete permit fee structure and requirements | Inspection freq: Routine inspections conducted on approximately 500 restaurants per year | Reinspection: Yellow Conditional Pass placard may trigger reinspection within 3 business days to ensure major violations remain corrected',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Sutter');

-- Tehama County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Tehama County Department of Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Uses ''Meets Standards'' or ''Does Not Meet Standards'' result system based on inspection reports, but specific letter grades or numerical scoring not verified in official sources"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode) - effective July 1, 2007. Uses ''Meets Standards'' or ''Does Not Meet Standards'' result system based on inspection reports, but specific letter grades or numerical scoring not verified in official sources',
    violation_weight_map = '{"methodology_description": "Uses ''Meets Standards'' or ''Does Not Meet Standards'' result system based on inspection reports, but specific letter grades or numerical scoring not verified in official sources"}'::jsonb,
    fire_ahj_name = 'Tehama County Fire Department',
    fire_ahj_type = 'county_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.tehama.gov/government/departments/environmental-health/',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Tehama County Environmental Health Department needed to verify: 1) Specific grading/scoring system used (letter grades, numerical scores, or pass/fail), 2) Risk-based inspection frequency schedules, 3) Fire department hood system inspection requirements, 4) Local ordinances beyond state CalCode requirements | Inspection freq: Unknown - specific risk-based scheduling not documented in available sources | Reinspection: Major violations require follow-up inspection - facilities may be closed for imminent health hazards',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Tehama');

-- Trinity County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Trinity County Environmental Health Division',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Trinity County publishes food facility inspection reports but specific grading methodology not found in official sources"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (CalCode). Trinity County publishes food facility inspection reports but specific grading methodology not found in official sources',
    violation_weight_map = '{"methodology_description": "Trinity County publishes food facility inspection reports but specific grading methodology not found in official sources"}'::jsonb,
    fire_ahj_name = 'Multiple local volunteer fire departments serve different areas - no central county fire authority identified',
    fire_ahj_type = 'county_fire',
    has_local_amendments = false,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://www.trinitycounty.org/255/Environmental-Health-Division',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Direct contact with Trinity County Environmental Health Division needed to confirm: 1) Exact grading system methodology, 2) Inspection frequency and risk-based scheduling, 3) Fire safety inspection authority and requirements for commercial kitchens, 4) Specific local ordinances beyond state food code | Inspection freq: Not specified in available sources | Reinspection: Reinspection fees charged for subsequent reinspections unless acceptable corrective time schedule submitted and approved',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Trinity');

-- Tulare County (CA) — confidence: low(?)
UPDATE jurisdictions
SET
    agency_name = 'Tulare County Division of Environmental Health',
    scoring_type = 'weighted_deduction',
    grading_type = 'report_only',
    grading_config = '{"crawl_type": "unknown", "description": "Grading system not clearly documented in available sources"}'::jsonb,
    scoring_methodology = 'California Retail Food Code (portion of California Health and Safety Code). Grading system not clearly documented in available sources',
    violation_weight_map = '{"methodology_description": "Grading system not clearly documented in available sources"}'::jsonb,
    fire_ahj_name = 'Tulare County Fire Department / Local Fire Authorities',
    fire_ahj_type = 'cal_fire',
    has_local_amendments = true,
    data_source_type = 'jie_crawl',
    data_source_url = 'https://tularecountyeh.org/eh/our-services/food',
    notes = 'JIE crawl: confidence=low(?) | NEEDS MANUAL VERIFICATION | Manual verification needed to determine specific grading methodology, inspection frequency schedules, risk categorization system, and detailed fire safety inspection requirements for commercial kitchen operations in Tulare County. | Inspection freq: Risk-based inspections - specific frequency not documented | Reinspection: Not specified in available sources',
    last_sync_at = now(),
    updated_at = now()
WHERE state = 'CA'
  AND lower(county) = lower('Tulare');

-- Verification: check updated rows
SELECT county, grading_type, scoring_type, agency_name,
       fire_ahj_name, pass_threshold, data_source_type, updated_at
FROM jurisdictions
WHERE county IN ('Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino', 'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare')
ORDER BY county;

COMMIT;