-- ============================================================
-- INTEL-01 Migration 002 — Seed 20 Intelligence Sources
-- ============================================================

INSERT INTO intelligence_sources (slug, name, source_type, base_url, crawl_method, crawl_frequency, jurisdiction, state_code, metadata) VALUES

-- ── 1-8: County Health Departments (Central Valley + Sacramento) ──────

('fresno-county-health',
 'Fresno County Department of Public Health',
 'health_dept',
 'https://www.co.fresno.ca.us/departments/public-health/environmental-health-system',
 'scrape', 'daily', 'fresno_county', 'CA',
 '{"county": "Fresno", "region": "Central Valley", "inspection_db": true}'::jsonb),

('merced-county-health',
 'Merced County Department of Public Health',
 'health_dept',
 'https://www.co.merced.ca.us/80/Environmental-Health',
 'scrape', 'daily', 'merced_county', 'CA',
 '{"county": "Merced", "region": "Central Valley", "inspection_db": true}'::jsonb),

('stanislaus-county-health',
 'Stanislaus County Environmental Resources',
 'health_dept',
 'https://www.stancounty.com/er/food-facility.shtm',
 'scrape', 'daily', 'stanislaus_county', 'CA',
 '{"county": "Stanislaus", "region": "Central Valley", "inspection_db": true}'::jsonb),

('mariposa-county-health',
 'Mariposa County Health Department',
 'health_dept',
 'https://www.mariposacounty.org/148/Environmental-Health',
 'scrape', 'weekly', 'mariposa_county', 'CA',
 '{"county": "Mariposa", "region": "Central Valley", "inspection_db": false, "note": "Small county, limited online data"}'::jsonb),

('tulare-county-health',
 'Tulare County Health & Human Services',
 'health_dept',
 'https://tchhsa.org/eng/index.cfm/public-health/environmental-health/',
 'scrape', 'daily', 'tulare_county', 'CA',
 '{"county": "Tulare", "region": "Central Valley", "inspection_db": true}'::jsonb),

('kings-county-health',
 'Kings County Department of Public Health',
 'health_dept',
 'https://www.countyofkings.com/departments/health-welfare/public-health',
 'scrape', 'weekly', 'kings_county', 'CA',
 '{"county": "Kings", "region": "Central Valley", "inspection_db": false}'::jsonb),

('kern-county-health',
 'Kern County Public Health Services',
 'health_dept',
 'https://kernpublichealth.com/environmental-health/',
 'scrape', 'daily', 'kern_county', 'CA',
 '{"county": "Kern", "region": "Central Valley", "inspection_db": true}'::jsonb),

('sacramento-county-health',
 'Sacramento County Environmental Management Department',
 'health_dept',
 'https://emd.saccounty.gov/EnvironmentalHealth/FoodProtection.html',
 'api', 'daily', 'sacramento_county', 'CA',
 '{"county": "Sacramento", "region": "Sacramento Valley", "inspection_db": true, "api_available": true}'::jsonb),

-- ── 9: California Legislative Tracker ─────────────────────────────────

('ca-legislative-tracker',
 'California State Legislature — Food Safety Bills',
 'legislative',
 'https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml',
 'scrape', 'weekly', 'california_state', 'CA',
 '{"body": "California State Legislature", "tracked_committees": ["Health","Agriculture","Governmental Organization"]}'::jsonb),

-- ── 10: FDA Recalls ──────────────────────────────────────────────────

('fda-recalls',
 'FDA Food Recall Enforcement Reports',
 'fda_recall',
 'https://api.fda.gov/food/enforcement.json',
 'api', 'daily', NULL, NULL,
 '{"api_key_env": "FDA_API_KEY", "national": true, "classification_filter": ["Class I","Class II"]}'::jsonb),

-- ── 11: USDA FSIS ────────────────────────────────────────────────────

('usda-fsis-recalls',
 'USDA Food Safety and Inspection Service',
 'fda_recall',
 'https://www.fsis.usda.gov/recalls',
 'rss', 'daily', NULL, NULL,
 '{"agency": "USDA", "national": true, "focus": "meat_poultry_eggs"}'::jsonb),

-- ── 12: CDC FoodNet ──────────────────────────────────────────────────

('cdc-foodnet',
 'CDC Foodborne Diseases Active Surveillance Network',
 'outbreak',
 'https://www.cdc.gov/foodnet/index.html',
 'scrape', 'daily', NULL, NULL,
 '{"agency": "CDC", "national": true, "surveillance_type": "active"}'::jsonb),

-- ── 13: CDPH Outbreaks ──────────────────────────────────────────────

('cdph-outbreaks',
 'California Department of Public Health — Outbreak Alerts',
 'outbreak',
 'https://www.cdph.ca.gov/Programs/CID/DCDC/Pages/Outbreak-Alerts.aspx',
 'scrape', 'daily', 'california_state', 'CA',
 '{"agency": "CDPH", "state_level": true}'::jsonb),

-- ── 14: NFPA Fire Code ──────────────────────────────────────────────

('nfpa-fire-code',
 'NFPA 96 — Ventilation Control and Fire Protection of Commercial Cooking',
 'fire_code',
 'https://www.nfpa.org/codes-and-standards/nfpa-96-standard-development',
 'scrape', 'monthly', NULL, NULL,
 '{"standard": "NFPA 96", "edition": "2024", "national": true}'::jsonb),

-- ── 15: CalOSHA ─────────────────────────────────────────────────────

('cal-osha',
 'California Division of Occupational Safety and Health',
 'osha',
 'https://www.dir.ca.gov/dosh/',
 'scrape', 'weekly', 'california_state', 'CA',
 '{"agency": "CalOSHA", "focus": "restaurant_workplace_safety"}'::jsonb),

-- ── 16: CA Restaurant Association ───────────────────────────────────

('ca-restaurant-assoc',
 'California Restaurant Association — Industry Updates',
 'industry_report',
 'https://www.calrest.org/industry-news',
 'rss', 'weekly', 'california_state', 'CA',
 '{"organization": "CRA", "content_type": "industry_news"}'::jsonb),

-- ── 17: Central Valley News ─────────────────────────────────────────

('central-valley-news',
 'Central Valley Food Safety News Aggregator',
 'news',
 NULL,
 'api', 'daily', NULL, 'CA',
 '{"api_key_env": "NEWS_API_KEY", "query_terms": ["food safety","restaurant closure","health inspection","foodborne illness"], "region": "Central Valley CA"}'::jsonb),

-- ── 18: National Restaurant Association ─────────────────────────────

('national-restaurant-assoc',
 'National Restaurant Association — Research & Reports',
 'industry_report',
 'https://restaurant.org/research-and-media/research/research-reports/',
 'scrape', 'monthly', NULL, NULL,
 '{"organization": "NRA", "national": true, "content_type": "research_reports"}'::jsonb),

-- ── 19: FDA Food Code ───────────────────────────────────────────────

('fda-food-code',
 'FDA Food Code Updates and Supplements',
 'regulatory',
 'https://www.fda.gov/food/retail-food-protection/fda-food-code',
 'scrape', 'monthly', NULL, NULL,
 '{"agency": "FDA", "national": true, "current_edition": "2022", "note": "Check for 2025 supplement"}'::jsonb),

-- ── 20: Weather Risk Monitor ────────────────────────────────────────

('weather-risk-monitor',
 'NWS Weather Risk Monitor — Food Safety Impact',
 'weather',
 'https://api.weather.gov/alerts/active',
 'api', 'hourly', NULL, 'CA',
 '{"api_key_env": "WEATHER_API_KEY", "focus_areas": ["heat_wave","power_outage","wildfire","flood"], "monitored_states": ["CA"]}'::jsonb);
