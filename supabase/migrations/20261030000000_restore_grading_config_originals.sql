-- CORRECTIVE: Restore grading_config for 8 counties damaged by 20260312200000
--
-- 20260312200000_top10_verified_weights.sql overwrote grading_config for 10
-- counties with simplified configs. The originals (from individual 20260303*
-- county migrations) were internally consistent with their scoring_methodology
-- prose and contained richer operational detail. The overwrite:
--
--   • FRESNO: Fabricated a numeric 100-point scoring system for a jurisdiction
--     that operates no scoring system at all. This is invented regulatory data
--     about a real jurisdiction — the single worst defect.
--   • MERCED: Collapsed 3 violation categories (critical/major/minor) to 2
--     (major/minor), relabeling values and dropping minor=1.
--   • SANTA CLARA: Dropped the moderate=3 violation tier, reducing 3 categories
--     to 2.
--   • SAN BERNARDINO: Lost the D grade tier (0-69), rescore rules, minimum
--     passing grade (B not A), data portal URL, Yelp integration.
--   • RIVERSIDE: Lost color card system (blue/green/red), Award of Recognition,
--     governing ordinance reference (No. 493/493.5), scoring method (Equipment
--     + Methods averaging).
--   • SAN DIEGO: Lost rescore rules (B voluntary, C mandatory 30 days),
--     governing ordinance (Section 61.107), MEHKO exemption flag.
--   • LA COUNTY: Lost closure trigger, risk categories, reinspection trigger.
--   • STANISLAUS: Lost CPRA access method, closure trigger (CalCode §114409),
--     food handler/manager requirements, transparency notes.
--
-- Two counties (Sacramento, Alameda) had no pre-existing individual migration.
-- Their only config is from the now-discredited overwrite. They are marked
-- unverified and blocked from county approval until checked against source
-- documents.
--
-- Fire AHJ data (fire_ahj_name, fire_code_edition, etc.) lives in separate
-- columns and is NOT affected by this restore. That data was the legitimate
-- payload of the overwrite migration.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. FRESNO COUNTY — CRITICAL
-- The overwrite fabricated scoring_type "numeric" with deductions for a county
-- whose prose, Grand Jury report, and own website all confirm: NO letter grade,
-- NO numeric score. Violation report only.
-- Original: 20260303500000_fresno_county_verified_config.sql
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "display_format": "violation_report",
    "grades": null,
    "letter_grade": false,
    "numeric_score": false,
    "grade_card_posted": false,
    "violation_categories": ["major", "minor"],
    "major_violation_action": "reinspection_usually_required_unless_corrected_onsite",
    "minor_violation_action": "correction_required_reinspection_not_always_required",
    "transparency_level": "low",
    "transparency_note": "Grand Jury 2023-24 found inspections extremely difficult to locate online, inconsistent enforcement, some facilities uninspected 1+ year, software failures causing missing/incomplete reports.",
    "public_portal": "https://www.fresnohealthinspections.com",
    "grading_note": "NO letter grade. NO numeric score. Fresno documents violations only. EvidLY provides the consistent analysis layer this jurisdiction lacks.",
    "evidly_value": "High-value jurisdiction for EvidLY — operators can see exactly what consistent compliance analysis provides where government transparency is low.",
    "grand_jury_report": {
      "title": "Eat At Your Own Risk: The Quiet Reality of Health Inspections in Fresno County",
      "year": "2023-2024",
      "key_findings": [
        "22 inspectors for ~11,000 facilities — mathematically impossible workload",
        "Some facilities uninspected for 1+ year despite 4x/year requirement",
        "Website hard to navigate, inspections hard to find",
        "Inconsistent enforcement across inspectors",
        "Software failures causing billing errors and missing reports"
      ],
      "county_response": "23% salary increase by July 2025, website navigation improvements committed"
    }
  }'::jsonb
WHERE county = 'Fresno' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. MERCED COUNTY
-- The overwrite collapsed 3 violation categories to 2 and relabeled them:
--   Original: critical=4, major=2, minor=1 (matches prose exactly)
--   Overwrite: major=4, minor=2 (labels shifted, minor=1 dropped)
-- Restoring the original base and preserving the verified methodology data
-- added by 20260521220000_merced_methodology_verified.sql (authority,
-- source_documents, violation_weight_evidence).
-- Original: 20260303600000_merced_county_verified_config.sql
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
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
    "grading_note": "Points accumulate upward per violation. Good (0-6), Satisfactory (7-13), Unsatisfactory (14+). No letter grades. Award of Excellence for zero-major facilities.",

    "authority": {
      "local_code": "CalCode §113709 enabling provision + Merced County Code Ch 9.42 Health Officer enforcement authority",
      "local_code_followup_needed": null,
      "rating_system_legal_basis": "departmental_policy_under_state_enabling",
      "authority_documented_in": "Merced County Food Program Ratings/Inspection Procedures (policy #31099, rev. Jan 4 2022)"
    },
    "source_documents": [
      {
        "title": "Merced County Food Program Ratings/Inspection Procedures (Point System Policy)",
        "document_id": "31099",
        "revision_date": "2022-01-04",
        "captured_date": "2026-05-21",
        "live_url": "https://www.countyofmerced.com/DocumentCenter/View/31099/",
        "purpose": "Primary methodology document — defines point system, three-tier ratings, repeat penalty, closure rules",
        "document_type": "departmental_policy"
      }
    ],
    "source_documents_needed": [],
    "grading_thresholds": {
      "color_provenance": "display_convention",
      "color_primary_source_verified": false,
      "color_note": "Green/Yellow/Red mapping follows standard food safety convention; not explicitly mapped in policy #31099"
    },
    "violation_weight_evidence": {
      "verification_method": "reverse_engineered_from_public_inspection_records",
      "verified_date": "2026-05-21",
      "evidence_samples": [
        {"facility": "Sugoi Sushi", "facility_id": "FA0006344", "violation_type": "major (food contact, time-only controls, temp holding)", "point_value": 7.00},
        {"facility": "Sugoi Sushi", "facility_id": "FA0006344", "violation_type": "minor (time labeling PHF)", "point_value": 3.00},
        {"facility": "Club Demo/Costco", "facility_id": "FA0009828", "violation_type": "minor (food safety certification)", "point_value": 3.00},
        {"facility": "Dominos", "facility_id": "FA0005026", "violation_type": "GRP (signage)", "point_value": 1.00}
      ]
    }
  }'::jsonb
WHERE county = 'Merced' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SANTA CLARA COUNTY
-- The overwrite dropped moderate=3 (3 categories → 2) and lost the numeric
-- score element, placard score ranges, SCCDineOut app, program launch date,
-- reinspection/closure triggers, and food handler/manager requirements.
-- Original: 20260303500001_santa_clara_county_config.sql
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "display_format": "green_yellow_red_numeric",
    "placards": {
      "green": {
        "status": "pass",
        "label": "PASS",
        "range": "90-100",
        "criteria": "Low violation burden — facility in compliance"
      },
      "yellow": {
        "status": "conditional_pass",
        "label": "CONDITIONAL PASS",
        "range": "70-89",
        "criteria": "Violations corrected during inspection. Reinspection within 3 business days."
      },
      "red": {
        "status": "closed",
        "label": "CLOSURE",
        "range": "Below 70",
        "criteria": "Imminent threat to health/safety; violations not corrected during inspection."
      }
    },
    "numeric_score": true,
    "score_base": 100,
    "score_direction": "downward_deduction",
    "violation_points": {
      "major": 8,
      "moderate": 3,
      "minor": 2
    },
    "score_note": "Green / Yellow / Red placard color determined by numeric score thresholds. Score: 100-pt deductive (Major=8, Moderate=3, Minor=2).",
    "placard_posted": true,
    "scc_dine_out_app": true,
    "program_launched": "2014-10-01",
    "reinspection_trigger": "Yellow placard — reinspection within 3 business days",
    "closure_trigger": "Red placard — score below 70 or imminent health/safety threat",
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
  }'::jsonb
WHERE county = 'Santa Clara' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SAN BERNARDINO COUNTY
-- The overwrite lost the D grade tier (0-69), minimum passing grade (B),
-- rescore rules (30-day window, 10-day completion, fee, closure on failure),
-- violation highlighting, data portal, Yelp integration, food handler/manager
-- requirements. Reduced 4 grades to 3.
-- Original: 20260303300000_san_bernardino_county_config.sql
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "display_format": "letter_grade",
    "grades": {
      "A": { "min": 90, "max": 100, "status": "pass",  "label": "Excellent compliance" },
      "B": { "min": 80, "max": 89,  "status": "pass",  "label": "Minimum passing grade" },
      "C": { "min": 70, "max": 79,  "status": "fail",  "label": "Mandatory re-score required within 30 days" },
      "D": { "min": 0,  "max": 69,  "status": "fail",  "label": "Immediate closure / permit suspension" }
    },
    "minimum_passing_grade": "B",
    "pass_threshold": 80,
    "rescore_trigger_grade": "C",
    "rescore_request_window_days": 30,
    "rescore_completion_days": 10,
    "rescore_fee": true,
    "rescore_target_grade": "B",
    "closure_on_rescore_failure": true,
    "violation_categories": ["major", "minor"],
    "major_violations_highlighted": "yellow_on_oir",
    "transparency_level": "high",
    "data_portal": "https://ehs.sbcounty.gov",
    "yelp_integration": true,
    "grading_note": "B is minimum passing. C triggers mandatory re-score (written request within 30 days, completed within 10 county business days, fee charged). Failure to achieve B on re-score = immediate closure.",
    "food_handler_card": {
      "issuer": "San Bernardino County EHS",
      "window_days": 60,
      "validity_years": 5,
      "note": "SBC issues its own county card — not interchangeable with all CA-approved cards"
    },
    "food_safety_manager": {
      "required": true,
      "min_per_facility": 1,
      "exam_type": "ANSI_accredited",
      "window_days": 60
    }
  }'::jsonb
WHERE county = 'San Bernardino' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. RIVERSIDE COUNTY
-- The overwrite lost color card system (blue A / green B / red C), Award of
-- Recognition (est. 1998), governing ordinance (No. 493/493.5), grading
-- history (since 1963), scoring method (Equipment + Methods averaging),
-- report availability window.
-- Original: 20260303600002_riverside_county_verified_config.sql
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [0, 79],
    "pass_requires": "A",
    "fail_below": 90,
    "grade_a_display": "blue_card",
    "grade_b_display": "green_card",
    "grade_c_display": "red_card",
    "closure_trigger": "permit_revocation_if_below_80_within_30_days",
    "grade_posting": "conspicuous_near_entrance_removed_only_by_health_officer",
    "reports_public": true,
    "report_availability": "within_1_week_up_to_2_years_history",
    "award_of_recognition": {
      "established": 1998,
      "criteria": "95%+ on all routine inspections previous calendar year",
      "min_inspections": 2
    },
    "verified_from": "Riverside County Ordinance No. 493/493.5",
    "inspection_frequency": "risk_based_annual_with_reinspection_for_B_C",
    "grading_since": 1963,
    "scoring_note": "Score computed by averaging Equipment and Methods scores"
  }'::jsonb
WHERE county = 'Riverside' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. SAN DIEGO COUNTY
-- The overwrite lost rescore rules (B voluntary once/year, C mandatory 30
-- days, reinspection within 10 business days), governing ordinance (Section
-- 61.107, Ordinance No. 10218), MEHKO exemption flag, modifier deduction
-- documentation, closure trigger, 99%+ A grade statistic.
-- Original: 20260303300001_san_diego_county_verified_config.sql
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [0, 79],
    "fail_below": null,
    "below_70_display": "letter_grade_C",
    "closure_trigger": "imminent_health_hazard",
    "grade_posting": "required_near_public_entrance",
    "reports_public": true,
    "mehko_exempt": true,
    "verified_from": "San Diego County Code Section 61.107 (Ordinance No. 10218)",
    "inspection_frequency": "typically_2_per_year_risk_based",
    "rescore_rules": {
      "B_grade": "voluntary_once_per_calendar_year",
      "C_grade": "mandatory_written_request_within_30_days",
      "rescore_inspection": "within_10_business_days_of_request"
    },
    "modifier_deductions": "none_documented",
    "note_99pct_a_grade": "NBC 7 Investigates: 99%+ of routine inspections result in A grades"
  }'::jsonb
WHERE county = 'San Diego' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. LOS ANGELES COUNTY
-- The overwrite lost closure trigger, risk categories, reinspection trigger,
-- below-70 display rule.
-- Original: 20260303200000_la_county_verified_config.sql
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "A": [90, 100],
    "B": [80, 89],
    "C": [70, 79],
    "fail_below": 70,
    "below_70_display": "numerical_score_card",
    "closure_trigger": "below_70_twice_in_12_months",
    "grade_posting": "required_visible_to_patrons",
    "reports_public": true,
    "verified_from": "LA County Code Title 8 §8.04.225",
    "inspection_frequency": "1-3 per year based on risk level",
    "risk_categories": ["High", "Moderate", "Low"],
    "reinspection_trigger": "Major CRF violations or score below 70"
  }'::jsonb
WHERE county = 'Los Angeles' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. STANISLAUS COUNTY
-- The overwrite lost CPRA access method, closure trigger (CalCode §114409),
-- violation action rules, food handler/manager requirements, transparency
-- documentation. Type (violation_report) was preserved but detail was not.
-- Original: 20260303400001_stanislaus_county_config.sql
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  grading_config = '{
    "display_format": "violation_report_only",
    "grades": {},
    "public_display": "none",
    "placard_required": false,
    "numeric_score_displayed": false,
    "transparency_level": "low",
    "data_access_method": "CPRA_request_only",
    "online_portal": false,
    "yelp_integration": false,
    "grading_note": "Stanislaus County does NOT issue letter grades, numeric scores, or color placards. Inspection results are documented via CalCode ORFIR (Official Report of Food Inspection) and are available only on-site during inspection or via CPRA request. The Modesto Bee (2024) investigated this lack of transparency.",
    "violation_categories": ["major", "minor"],
    "major_violation_action": "Correction required on-site or reinspection scheduled",
    "reinspection_trigger": "Uncorrected major violations",
    "closure_trigger": "Imminent health hazard per CalCode §114409",
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
  }'::jsonb
WHERE county = 'Stanislaus' AND city IS NULL AND state = 'CA';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. SACRAMENTO COUNTY — MARK UNVERIFIED
-- No original 20260303* migration exists. The only grading_config comes from
-- the discredited overwrite. Mark unverified and block from county approval
-- until checked against source documents.
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  jie_audit_status = 'needs_review',
  confidence_score = 0,
  grading_config = grading_config || '{"verification_blocked": true, "verification_blocked_reason": "Only config source is 20260312200000 (discredited overwrite). Must verify against Sacramento County EMD source documents before approval."}'::jsonb
WHERE county = 'Sacramento' AND city IS NULL AND state = 'CA';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. ALAMEDA COUNTY — MARK UNVERIFIED
-- No original 20260303* migration exists. Same situation as Sacramento.
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE jurisdictions SET
  jie_audit_status = 'needs_review',
  confidence_score = 0,
  grading_config = grading_config || '{"verification_blocked": true, "verification_blocked_reason": "Only config source is 20260312200000 (discredited overwrite). Must verify against Alameda County DEH source documents before approval."}'::jsonb
WHERE county = 'Alameda' AND city IS NULL AND state = 'CA';

COMMIT;
