-- ═══════════════════════════════════════════════════════════════════════
-- Seed Regulatory Sources — ensure all monitored sources exist
--
-- This migration re-inserts the core regulatory sources that the
-- Regulatory Alerts page depends on. Uses ON CONFLICT DO NOTHING
-- so it's safe to run even if the original seed already applied.
--
-- Also adds county-specific sources (Fresno, Merced, Stanislaus)
-- that appear in the monitoring UI but were missing from the
-- original seed in 20260224000000_regulatory_change_tables.sql.
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO regulatory_sources (code_name, code_short, jurisdiction_type, jurisdiction_code, current_edition, issuing_body, monitoring_url) VALUES
  -- Federal
  ('FDA Food Code', 'fda_food_code', 'federal', NULL, '2022', 'U.S. Food and Drug Administration', 'https://www.fda.gov/food/retail-food-protection/fda-food-code'),

  -- Industry / NFPA
  ('NFPA 96 (Ventilation & Fire Protection)', 'nfpa_96', 'industry', NULL, '2025', 'National Fire Protection Association', 'https://www.nfpa.org/codes-and-standards/nfpa-96-standard-development/96'),
  ('NFPA 10 (Portable Fire Extinguishers)', 'nfpa_10', 'industry', NULL, '2025', 'National Fire Protection Association', 'https://www.nfpa.org/codes-and-standards/nfpa-10-standard-development/10'),
  ('NFPA 17A (Wet Chemical Suppression)', 'nfpa_17a', 'industry', NULL, '2021', 'National Fire Protection Association', NULL),
  ('International Mechanical Code', 'imc', 'industry', NULL, '2021', 'ICC', NULL),
  ('International Fire Code', 'ifc', 'industry', NULL, '2021', 'ICC', NULL),

  -- State — California
  ('California Retail Food Code (CalCode)', 'calcode', 'state', 'CA', '2024', 'California Legislature', 'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx'),
  ('California Health & Safety Code', 'ca_hsc', 'state', 'CA', '2024', 'California Legislature', NULL),
  ('California Fire Code (CFC)', 'cfc', 'state', 'CA', '2022', 'Office of the State Fire Marshal', 'https://osfm.fire.ca.gov/what-we-do/fire-engineering-and-investigations/codes-and-standards'),
  ('Cal/OSHA Workplace Safety', 'cal_osha', 'state', 'CA', '2024', 'California DIR', 'https://www.dir.ca.gov/dosh/'),

  -- State — Other
  ('Texas Food Establishment Rules', 'tx_food', 'state', 'TX', '2024', 'Texas DSHS', NULL),
  ('Florida DBPR Food Code', 'fl_food', 'state', 'FL', '2024', 'Florida DBPR', NULL),
  ('New York State Sanitary Code', 'ny_food', 'state', 'NY', '2024', 'New York DOH', NULL),

  -- County — Central California (demo locations)
  ('Fresno County Health Department', 'fresno_co', 'county', 'CA', '2024', 'Fresno County Department of Public Health', 'https://www.co.fresno.ca.us/departments/public-health'),
  ('Merced County Division of Environmental Health', 'merced_co', 'county', 'CA', '2024', 'Merced County Community & Economic Development', 'https://www.co.merced.ca.us/departments/community-and-economic-development/environmental-health'),
  ('Stanislaus County Environmental Resources', 'stanislaus_co', 'county', 'CA', '2024', 'Stanislaus County Department of Environmental Resources', 'https://www.stancounty.com/er/environmental-health.shtm')
ON CONFLICT (code_short) DO NOTHING;
