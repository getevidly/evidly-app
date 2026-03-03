-- ═══════════════════════════════════════════════════════════════════════
-- JURISDICTION INTELLIGENCE — JI-1: Database + Seed Data
-- 8 tables + 62 California food safety jurisdictions
-- Feature #49 (Jurisdiction Intelligence Engine)
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- TABLE 1: jurisdictions
-- Master reference for ALL enforcement agencies
-- Handles: scoring methodology, grading format, violation weights,
--          threshold mapping, ingestion config, fire AHJ linkage
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── IDENTITY ──
  state TEXT NOT NULL DEFAULT 'CA',
  county TEXT NOT NULL,
  city TEXT,
  agency_name TEXT NOT NULL,
  agency_type TEXT NOT NULL DEFAULT 'county_health',
  jurisdiction_type TEXT NOT NULL DEFAULT 'food_safety',
  county_fips TEXT,

  -- ── FOOD SAFETY SCORING ──
  scoring_type TEXT NOT NULL DEFAULT 'weighted_deduction',
  grading_type TEXT NOT NULL DEFAULT 'letter_grade',
  grading_config JSONB NOT NULL DEFAULT '{}',
  scoring_methodology TEXT,
  violation_weight_map JSONB DEFAULT '{}',
  pass_threshold INTEGER,
  warning_threshold INTEGER,
  critical_threshold INTEGER,

  -- ── FIRE SAFETY AHJ ──
  fire_ahj_name TEXT,
  fire_ahj_type TEXT,
  fire_code_edition TEXT DEFAULT '2025 CFC',
  nfpa96_edition TEXT DEFAULT '2024',
  has_local_amendments BOOLEAN DEFAULT false,
  local_amendment_notes TEXT,
  hood_cleaning_default TEXT DEFAULT 'quarterly',

  -- ── INGESTION PIPELINE ──
  data_source_type TEXT,
  data_source_url TEXT,
  data_source_tier INTEGER,
  scraper_config JSONB DEFAULT '{}',
  refresh_frequency TEXT DEFAULT 'weekly',
  last_sync_at TIMESTAMPTZ,
  facility_count INTEGER,

  -- ── META ──
  population_rank INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jurisdictions_state_county ON jurisdictions(state, county);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_city ON jurisdictions(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jurisdictions_county_fips ON jurisdictions(county_fips);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_scoring_type ON jurisdictions(scoring_type);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_grading_type ON jurisdictions(grading_type);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_data_source_tier ON jurisdictions(data_source_tier);

CREATE OR REPLACE FUNCTION update_jurisdictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jurisdictions_updated_at
  BEFORE UPDATE ON jurisdictions
  FOR EACH ROW EXECUTE FUNCTION update_jurisdictions_updated_at();


-- ═══════════════════════════════════════════════════════════
-- TABLE 2: location_jurisdictions
-- Each location can have MULTIPLE jurisdictions:
--   food_safety (county health dept)
--   fire_safety (city/county fire dept)
--   federal (NPS for Yosemite, etc.)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS location_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  jurisdiction_layer TEXT NOT NULL,
  is_most_restrictive BOOLEAN DEFAULT false,
  auto_detected BOOLEAN DEFAULT true,
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(location_id, jurisdiction_id, jurisdiction_layer)
);

CREATE INDEX IF NOT EXISTS idx_loc_jurisdictions_location ON location_jurisdictions(location_id);
CREATE INDEX IF NOT EXISTS idx_loc_jurisdictions_jurisdiction ON location_jurisdictions(jurisdiction_id);


-- ═══════════════════════════════════════════════════════════
-- TABLE 3: jurisdiction_violation_overrides
-- When a jurisdiction weights a specific CalCode violation
-- differently than the default
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jurisdiction_violation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  calcode_section TEXT NOT NULL,
  severity_override TEXT,
  point_deduction_override NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(jurisdiction_id, calcode_section)
);

CREATE INDEX IF NOT EXISTS idx_jvo_jurisdiction ON jurisdiction_violation_overrides(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_jvo_calcode ON jurisdiction_violation_overrides(calcode_section);


-- ═══════════════════════════════════════════════════════════
-- TABLE 4: score_calculations
-- Audit trail: every time EvidLY calculates a compliance score,
-- the inputs, methodology, and result are recorded here.
-- This is the inspector defense record.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS score_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  calculation_type TEXT NOT NULL,
  pillar TEXT,
  sub_component TEXT,
  raw_score NUMERIC NOT NULL,
  normalized_score NUMERIC NOT NULL,
  jurisdiction_grade TEXT,
  grade_display TEXT,
  pass_fail TEXT,
  inputs JSONB NOT NULL DEFAULT '{}',
  methodology TEXT,
  calculation_details JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  calculated_by TEXT DEFAULT 'system',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_calc_location ON score_calculations(location_id);
CREATE INDEX IF NOT EXISTS idx_score_calc_jurisdiction ON score_calculations(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_score_calc_type ON score_calculations(calculation_type);
CREATE INDEX IF NOT EXISTS idx_score_calc_date ON score_calculations(calculated_at DESC);


-- ═══════════════════════════════════════════════════════════
-- TABLE 5: calcode_violation_map
-- Maps California Retail Food Code sections to EvidLY modules
-- POPULATED IN JI-2 — just create the structure here
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS calcode_violation_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calcode_section TEXT NOT NULL UNIQUE,
  calcode_title TEXT NOT NULL,
  description TEXT,
  severity_default TEXT NOT NULL,
  point_deduction_default NUMERIC NOT NULL,
  evidly_module TEXT,
  evidly_checklist_item TEXT,
  evidly_pillar TEXT NOT NULL,
  cdc_risk_factor BOOLEAN DEFAULT false,
  cdc_risk_category TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calcode_section ON calcode_violation_map(calcode_section);
CREATE INDEX IF NOT EXISTS idx_calcode_module ON calcode_violation_map(evidly_module);
CREATE INDEX IF NOT EXISTS idx_calcode_pillar ON calcode_violation_map(evidly_pillar);
CREATE INDEX IF NOT EXISTS idx_calcode_severity ON calcode_violation_map(severity_default);


-- ═══════════════════════════════════════════════════════════
-- TABLES 6-8: INGESTION PIPELINE (structure only)
-- These will be populated when the ingestion pipeline runs.
-- Creating now so the schema is complete.
-- ═══════════════════════════════════════════════════════════

-- Table 6: external_facilities
CREATE TABLE IF NOT EXISTS external_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  external_id TEXT,
  facility_name TEXT NOT NULL,
  facility_type TEXT,
  address_line1 TEXT,
  city TEXT,
  zip_code TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  permit_number TEXT,
  permit_status TEXT,
  current_grade TEXT,
  current_score NUMERIC,
  last_inspection_date DATE,
  matched_org_id UUID,
  match_confidence NUMERIC,
  match_status TEXT DEFAULT 'unmatched',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(external_id, jurisdiction_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_fac_jurisdiction ON external_facilities(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_ext_fac_name_city ON external_facilities(facility_name, city);
CREATE INDEX IF NOT EXISTS idx_ext_fac_zip ON external_facilities(zip_code);
CREATE INDEX IF NOT EXISTS idx_ext_fac_matched ON external_facilities(matched_org_id) WHERE matched_org_id IS NOT NULL;

-- Table 7: external_inspections
CREATE TABLE IF NOT EXISTS external_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES external_facilities(id),
  external_inspection_id TEXT,
  inspection_date DATE NOT NULL,
  inspection_type TEXT,
  score NUMERIC,
  normalized_score NUMERIC,
  grade TEXT,
  major_violations INTEGER,
  minor_violations INTEGER,
  grp_violations INTEGER,
  inspector_name TEXT,
  summary TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_insp_facility ON external_inspections(facility_id);
CREATE INDEX IF NOT EXISTS idx_ext_insp_date ON external_inspections(inspection_date DESC);

-- Table 8: external_violations
CREATE TABLE IF NOT EXISTS external_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES external_inspections(id),
  violation_code TEXT,
  calcode_section TEXT,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  point_deduction NUMERIC,
  corrected_on_site BOOLEAN,
  compliance_date DATE,
  is_repeat BOOLEAN,
  evidly_checklist_map TEXT,
  evidly_pillar TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_viol_inspection ON external_violations(inspection_id);
CREATE INDEX IF NOT EXISTS idx_ext_viol_calcode ON external_violations(calcode_section);
CREATE INDEX IF NOT EXISTS idx_ext_viol_severity ON external_violations(severity);


-- ═══════════════════════════════════════════════════════════
-- ENABLE RLS ON ALL TABLES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_violation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calcode_violation_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_violations ENABLE ROW LEVEL SECURITY;

-- Jurisdictions and calcode_violation_map are public reference data (read-only for all authenticated)
CREATE POLICY "Jurisdictions readable by all authenticated"
  ON jurisdictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "CalCode map readable by all authenticated"
  ON calcode_violation_map FOR SELECT
  TO authenticated
  USING (true);


-- ═══════════════════════════════════════════════════════════
-- SEED: 62 California Food Safety Jurisdictions
-- 58 counties + 4 independent cities (Long Beach, Pasadena, Berkeley, Vernon)
-- ═══════════════════════════════════════════════════════════

-- ── TIER 1: Open Data APIs (3 agencies, ~99K facilities) ──

INSERT INTO jurisdictions (county, city, agency_name, scoring_type, grading_type, grading_config, pass_threshold, warning_threshold, critical_threshold, data_source_type, data_source_url, data_source_tier, facility_count, population_rank, fire_ahj_name, fire_ahj_type, has_local_amendments, notes) VALUES

('Los Angeles', NULL, 'Los Angeles County Department of Public Health', 'weighted_deduction', 'letter_grade',
  '{"A": [90,100], "B": [80,89], "C": [70,79], "fail_below": 70}',
  90, 79, 69, 'api', 'https://data.lacounty.gov', 1, 88000, 1,
  'Los Angeles County Fire Department', 'county_fd', true,
  'Largest dataset in CA. Socrata API. 5 years of data. Bulk CSV/JSON. LACoFD serves unincorporated + 60 contract cities. LAFD serves City of LA.'),

('San Francisco', NULL, 'San Francisco Department of Public Health', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'api', 'https://data.sfgov.org', 1, 7500, 4,
  'San Francisco Fire Department', 'city_fd', true,
  'LIVES standard CSV. Score + violations. Well-structured. DataSF portal.'),

('Sonoma', NULL, 'Sonoma County Department of Health Services', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'api', 'https://data.sonomacounty.ca.gov', 1, 3200, 26,
  'Sonoma County Fire District / CAL FIRE LNU', 'cal_fire', false,
  'Open data portal with inspection map and downloadable data.'),

-- ── TIER 2: MyHealthDepartment Platform (4 agencies, ~29.5K facilities) ──

('Sacramento', NULL, 'Sacramento County Environmental Management Department', 'major_violation_count', 'color_placard',
  '{"green": {"max_majors": 1}, "yellow": {"max_majors": 3}, "red": {"min_majors": 4}}',
  NULL, NULL, NULL, 'mhd', 'https://inspections.myhealthdepartment.com/sacramento', 2, 8500, 6,
  'Sacramento Fire Department / Sacramento Metro Fire', 'city_fd', false,
  'MHD template. Color placard system. Searchable by facility name, date, purpose.'),

('Orange', NULL, 'Orange County Health Care Agency', 'weighted_deduction', 'letter_grade',
  '{"A": [90,100], "B": [80,89], "C": [70,79], "fail_below": 70}',
  90, 79, 69, 'mhd', 'https://inspections.myhealthdepartment.com/orange', 2, 18000, 3,
  'Orange County Fire Authority', 'county_fd', true,
  'MHD template. Major/Minor violations. Detailed reports. OCFA serves unincorporated + 23 contract cities.'),

('Yolo', NULL, 'Yolo County Health Department', 'weighted_deduction', 'report_only',
  '{}',
  NULL, NULL, NULL, 'mhd', 'https://inspections.myhealthdepartment.com/yolo', 2, 1200, 40,
  'CAL FIRE LNU / Woodland FD', 'cal_fire', false,
  'MHD template. Same scraper as Sacramento/Orange. Report-only.'),

('San Luis Obispo', NULL, 'San Luis Obispo County Health Department', 'negative_scale', 'score_negative',
  '{"perfect": 0, "warning": -10, "critical": -25}',
  NULL, -10, -25, 'mhd', 'https://inspections.myhealthdepartment.com/slo', 2, 1800, 32,
  'CAL FIRE SLU / SLO City FD', 'cal_fire', false,
  'New negative scoring system as of May 2025. 0 = perfect.'),

-- ── TIER 3: Custom Web Portals (25 counties + 4 independent cities) ──

('San Diego', NULL, 'San Diego County Department of Environmental Health', 'weighted_deduction', 'letter_grade',
  '{"A": [90,100], "B": [80,89], "C": [70,79], "fail_below": 70}',
  90, 79, 69, 'portal', 'https://www.sandiegocounty.gov/deh/fhd/ffis', 3, 14000, 2,
  'San Diego Fire-Rescue / San Diego County Fire Authority', 'city_fd', true,
  'Custom portal. Searchable by name/address. Grade + violations.'),

('Riverside', NULL, 'Riverside County Department of Environmental Health', 'weighted_deduction', 'letter_grade_strict',
  '{"A": [90,100], "B": [80,89], "C": [70,79], "pass_requires": "A"}',
  90, 89, 79, 'portal', 'https://rivcoeh.org', 3, 12000, 5,
  'Riverside Fire Department / CAL FIRE RRU', 'cal_fire', false,
  'KEY DEMO COUNTY. 88 = FAIL in Riverside. A-only passes. 95 CAL FIRE stations.'),

('San Bernardino', NULL, 'San Bernardino County Department of Public Health', 'weighted_deduction', 'letter_grade',
  '{"A": [90,100], "B": [80,89], "C": [70,79], "fail_below": 70}',
  90, 79, 69, 'portal', 'https://www.sbcounty.gov', 3, 9000, 7,
  'San Bernardino County Fire', 'county_fd', false,
  'Published LIVES feed to Yelp. Letter grades. 2 years data.'),

('Alameda', NULL, 'Alameda County Department of Environmental Health', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://deh.acgov.org', 3, 8500, 8,
  'Alameda County Fire / Oakland FD', 'county_fd', false,
  '6 CDC major risk factors. 2-4 pts/major, 1 pt/minor. 26 pts max deduction.'),

('Santa Clara', NULL, 'Santa Clara County Department of Environmental Health', 'heavy_weighted', 'color_placard',
  '{"green": {"max_majors": 0}, "yellow": {"max_majors": 2}, "red": {"min_majors": 3}}',
  NULL, NULL, NULL, 'portal', 'https://www.sccgov.org', 3, 10000, 9,
  'Santa Clara County Fire / San Jose FD', 'county_fd', true,
  '8-point major violations. Color placard. Large market.'),

('Contra Costa', NULL, 'Contra Costa Health Services', 'major_violation_count', 'color_placard',
  '{"green": {"max_majors": 1}, "yellow": {"max_majors": 3}, "red": {"min_majors": 4}, "white": {"condition": "new_or_reopened"}}',
  NULL, NULL, NULL, 'portal', 'https://cchealth.org', 3, 5500, 11,
  'Contra Costa County FPD', 'fire_district', false,
  '4-color system (includes white for new/reopened). Searchable online.'),

('Fresno', NULL, 'Fresno County Department of Public Health', 'weighted_deduction', 'letter_grade',
  '{"A": [90,100], "B": [80,89], "C": [70,79], "fail_below": 70}',
  90, 79, 69, 'portal', 'https://www.co.fresno.ca.us', 3, 4500, 10,
  'Fresno Fire Department', 'city_fd', false,
  'YOUR TERRITORY. Letter grade county. Key for Central Valley expansion. CAL FIRE FKU unit.'),

('Kern', NULL, 'Kern County Public Health Services Department', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://kernpublichealth.com', 3, 4000, 12,
  'Kern County Fire Department', 'county_fd', false,
  'Score-based. Bakersfield metro. Contract county with CAL FIRE.'),

('Ventura', NULL, 'Ventura County Environmental Health Division', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://vcrma.org', 3, 4500, 13,
  'Ventura County Fire Department', 'county_fd', true,
  'Score + violations online. Contract county with CAL FIRE.'),

('San Mateo', NULL, 'San Mateo County Health Department', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://smchealth.org', 3, 3800, 16,
  'CAL FIRE CZU / local FDs', 'cal_fire', false,
  'Peninsula. Tech-savvy market.'),

('Placer', NULL, 'Placer County Health Department', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'portal', 'https://www.placer.ca.gov', 3, 2200, 22,
  'CAL FIRE NEU / Roseville FD', 'cal_fire', false,
  'No public grade. Report-only.'),

('Stanislaus', NULL, 'Stanislaus County Health Services Agency', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'portal', 'https://schsa.org', 3, 2500, 17,
  'Modesto FD / CAL FIRE', 'city_fd', false,
  'YOUR TERRITORY. Central Valley. Report-only.'),

('San Joaquin', NULL, 'San Joaquin County Public Health Services', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'portal', 'https://sjcphs.org', 3, 3500, 14,
  'Stockton FD / CAL FIRE SKU', 'city_fd', false,
  'YOUR TERRITORY. Stockton/Tracy/Manteca. Report-only.'),

('Tulare', NULL, 'Tulare County Health & Human Services Agency', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'portal', 'https://tularecounty.ca.gov', 3, 2000, 19,
  'CAL FIRE TUU / Visalia FD', 'cal_fire', false,
  'YOUR TERRITORY. Visalia metro. Report-only.'),

('Santa Barbara', NULL, 'Santa Barbara County Public Health Department', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://sbcphd.org', 3, 2800, 23,
  'Santa Barbara County Fire Department', 'county_fd', true,
  'Score + violations. Contract county with CAL FIRE.'),

('Solano', NULL, 'Solano County Department of Resource Management', 'major_violation_count', 'color_placard',
  '{"green": {"max_majors": 1}, "yellow": {"max_majors": 3}, "red": {"min_majors": 4}}',
  NULL, NULL, NULL, 'portal', 'https://solanocounty.com', 3, 2200, 24,
  'CAL FIRE LNU / Vallejo FD', 'cal_fire', false,
  'Color placard system.'),

('Monterey', NULL, 'Monterey County Health Department', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://www.co.monterey.ca.us', 3, 2500, 25,
  'CAL FIRE SLU / Salinas FD', 'cal_fire', false,
  'Score-based inspections.'),

('Marin', NULL, 'Marin County Community Development Agency', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://www.marincounty.org', 3, 1800, 28,
  'Marin County Fire Department', 'county_fd', true,
  'Custom search portal + open data. Contract county with CAL FIRE.'),

('Santa Cruz', NULL, 'Santa Cruz County Health Services Agency', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://www.co.santa-cruz.ca.us', 3, 1500, 30,
  'CAL FIRE CZU / Santa Cruz FD', 'cal_fire', false,
  'Score + violations.'),

('Butte', NULL, 'Butte County Public Health', 'major_violation_count', 'color_placard',
  '{"green": {"max_majors": 1}, "yellow": {"max_majors": 3}, "red": {"min_majors": 4}}',
  NULL, NULL, NULL, 'portal', 'https://buttecounty.net', 3, 1200, 29,
  'CAL FIRE BTU / Chico FD', 'cal_fire', false,
  'Color-coded placard. Training videos available.'),

('Shasta', NULL, 'Shasta County Health & Human Services Agency', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'portal', 'https://www.shastacounty.gov', 3, 1000, 33,
  'CAL FIRE BEU / Redding FD', 'cal_fire', false,
  'Report-only. CalCode enforcement.'),

('El Dorado', NULL, 'El Dorado County Environmental Management', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'portal', 'https://www.edcgov.us', 3, 1200, 31,
  'CAL FIRE AEU / El Dorado Hills FD', 'cal_fire', false,
  'Report-only.'),

('Napa', NULL, 'Napa County Public Health', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://www.countyofnapa.org', 3, 1100, 35,
  'CAL FIRE LNU / Napa City FD', 'cal_fire', false,
  'Wine country. Tourism-heavy.'),

-- ── INDEPENDENT CITIES (4 cities with own health departments) ──

('Los Angeles', 'Long Beach', 'City of Long Beach Health Department', 'weighted_deduction', 'letter_grade',
  '{"A": [90,100], "B": [80,89], "C": [70,79], "fail_below": 70}',
  90, 79, 69, 'portal', 'https://www.longbeach.gov/health', 3, 3000, 15,
  'Long Beach Fire Department', 'city_fd', true,
  'Independent from LA County. Own inspection program.'),

('Los Angeles', 'Pasadena', 'City of Pasadena Public Health Department', 'weighted_deduction', 'score_100',
  '{"pass_threshold": 70}',
  70, 79, 69, 'portal', 'https://www.cityofpasadena.net', 3, 1200, 36,
  'Pasadena Fire Department', 'city_fd', false,
  'Independent. Online database + public scoring placards.'),

('Alameda', 'Berkeley', 'City of Berkeley Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'portal', 'https://www.berkeleyca.gov', 3, 800, 42,
  'Berkeley Fire Department', 'city_fd', false,
  'Independent but struggling. 29 inspection rate in 2023.'),

('Los Angeles', 'Vernon', 'City of Vernon Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'portal', 'https://www.vernon.ca.gov', 3, 100, 62,
  'Vernon Fire Department', 'city_fd', false,
  'Industrial city. Very few retail food. Mostly warehouses.'),

-- ── TIER 4: Offline / FOIA (26 small/rural counties) ──

('Merced', NULL, 'Merced County Department of Public Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', NULL, 4, 1200, 20,
  'CAL FIRE MMU / Merced FD', 'cal_fire', false,
  'YOUR TERRITORY. May need direct relationship with county EH.'),

('Madera', NULL, 'Madera County Department of Public Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', NULL, 4, 700, 34,
  'CAL FIRE MMU / Madera FD', 'cal_fire', false,
  'YOUR TERRITORY. Small county. Direct relationship likely needed.'),

('Mariposa', NULL, 'Mariposa County Health Department', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', NULL, 4, 150, 58,
  'CAL FIRE MMU / NPS (Yosemite)', 'cal_fire', false,
  'YOUR TERRITORY. Aramark/Yosemite. Federal overlay. NPS dual-compliance.'),

('Kings', NULL, 'Kings County Department of Public Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.countyofkings.com', 4, 700, 37,
  'CAL FIRE TUU / Hanford FD', 'cal_fire', false, 'Central Valley. Small.'),

('Tuolumne', NULL, 'Tuolumne County Health Department', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', NULL, 4, 400, 46,
  'CAL FIRE TCU', 'cal_fire', false, 'Small mountain county.'),

('Calaveras', NULL, 'Calaveras County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.co.calaveras.ca.us', 4, 300, 49,
  'CAL FIRE TCU', 'cal_fire', false, 'Very small.'),

('Humboldt', NULL, 'Humboldt County Department of Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://humboldtgov.org', 4, 900, 27,
  'CAL FIRE HUU / Eureka FD', 'cal_fire', false, 'Remote. Limited online.'),

('Mendocino', NULL, 'Mendocino County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.mendocinocounty.org', 4, 600, 38,
  'CAL FIRE MEU', 'cal_fire', false, 'Remote.'),

('Lake', NULL, 'Lake County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.lakecountyca.gov', 4, 400, 44,
  'CAL FIRE LNU', 'cal_fire', false, 'Very small.'),

('Sutter', NULL, 'Sutter County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.suttercounty.org', 4, 500, 41,
  'CAL FIRE NEU / Yuba City FD', 'cal_fire', false, 'Small. Yuba City.'),

('Yuba', NULL, 'Yuba County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.co.yuba.ca.us', 4, 400, 43,
  'CAL FIRE NEU / Marysville FD', 'cal_fire', false, 'Small.'),

('Tehama', NULL, 'Tehama County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.tehamacounty.ca.gov', 4, 350, 47,
  'CAL FIRE TGU / Red Bluff FD', 'cal_fire', false, 'Very small.'),

('Nevada', NULL, 'Nevada County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.mynevadacounty.com', 4, 700, 36,
  'CAL FIRE NEU / Grass Valley FD', 'cal_fire', false, 'Grass Valley/Nevada City.'),

('Siskiyou', NULL, 'Siskiyou County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.co.siskiyou.ca.us', 4, 300, 50,
  'CAL FIRE SHU', 'cal_fire', false, 'Very remote.'),

('Del Norte', NULL, 'Del Norte County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.co.del-norte.ca.us', 4, 200, 55,
  'CAL FIRE HUU / Crescent City FD', 'cal_fire', false, 'Smallest populated.'),

('Lassen', NULL, 'Lassen County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.co.lassen.ca.us', 4, 200, 56,
  'CAL FIRE LMU', 'cal_fire', false, 'Very remote.'),

('Plumas', NULL, 'Plumas County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.plumascounty.us', 4, 200, 57,
  'CAL FIRE BTU', 'cal_fire', false, 'Mountain county.'),

('Modoc', NULL, 'Modoc County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.co.modoc.ca.us', 4, 80, 60,
  'CAL FIRE LMU', 'cal_fire', false, 'Least populated.'),

('Sierra', NULL, 'Sierra County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.sierracounty.ca.gov', 4, 40, 61,
  'CAL FIRE NEU', 'cal_fire', false, 'Smallest county. ~40 facilities.'),

('Alpine', NULL, 'Alpine County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.alpinecountyca.gov', 4, 20, 62,
  'CAL FIRE AEU', 'cal_fire', false, 'Least populated county in CA.'),

('Trinity', NULL, 'Trinity County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.trinitycounty.org', 4, 120, 54,
  'CAL FIRE BEU', 'cal_fire', false, 'Very remote.'),

('Glenn', NULL, 'Glenn County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.countyofglenn.net', 4, 200, 52,
  'CAL FIRE TGU', 'cal_fire', false, 'Small ag county.'),

('Colusa', NULL, 'Colusa County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.countyofcolusa.org', 4, 150, 53,
  'CAL FIRE BTU', 'cal_fire', false, 'Very small.'),

('Amador', NULL, 'Amador County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.amadorgov.org', 4, 300, 48,
  'CAL FIRE AEU', 'cal_fire', false, 'Small.'),

('Mono', NULL, 'Mono County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.monocounty.ca.gov', 4, 150, 59,
  'CAL FIRE (multiple units)', 'cal_fire', false, 'Mammoth Lakes area.'),

('Inyo', NULL, 'Inyo County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.inyocounty.us', 4, 150, 51,
  'CAL FIRE (multiple units)', 'cal_fire', false, 'Death Valley area.'),

('Imperial', NULL, 'Imperial County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.imperialcounty.org', 4, 900, 21,
  'Imperial County Fire / CAL FIRE', 'cal_fire', false, 'Border county.'),

('San Benito', NULL, 'San Benito County Environmental Health', 'weighted_deduction', 'report_only',
  '{}', NULL, NULL, NULL, 'offline', 'https://www.cosb.us', 4, 300, 45,
  'CAL FIRE (SCU)', 'cal_fire', false, 'Small.');
