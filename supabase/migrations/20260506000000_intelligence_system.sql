-- ════════════════════════════════════════════════════════════
-- EVIDLY INTELLIGENCE SYSTEM
-- Core competitive moat: 80+ sources, signal tracking,
-- JIE updates, client correlations
-- ════════════════════════════════════════════════════════════

-- ── Intelligence Sources ─────────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'jurisdiction_food','jurisdiction_fire','state_agency',
    'federal_agency','legislative','industry',
    'competitive','insurance','news'
  )),
  subcategory TEXT,
  url TEXT,
  crawl_method TEXT CHECK (crawl_method IN ('rss','html','api','pdf','manual','firecrawl')),
  crawl_frequency TEXT DEFAULT 'daily' CHECK (crawl_frequency IN (
    'realtime','hourly','daily','weekly','monthly','manual'
  )),
  last_crawled_at TIMESTAMPTZ,
  last_signal_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','waf_blocked','broken','pending')),
  signal_count_total INT DEFAULT 0,
  signal_count_30d INT DEFAULT 0,
  is_demo_critical BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Intelligence Signals ─────────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES intelligence_sources(id),
  source_key TEXT,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'regulatory_change','inspection_methodology','enforcement_action',
    'recall','outbreak','legislation','nfpa_update',
    'fire_inspection_change','competitor_activity','industry_trend',
    'osfm_update','calfire_update','permit_change'
  )),
  title TEXT NOT NULL,
  summary TEXT,
  full_content TEXT,
  source_url TEXT,
  published_date DATE,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  scope TEXT DEFAULT 'statewide' CHECK (scope IN (
    'federal','statewide','multi_county','county','city','local'
  )),
  affected_jurisdictions TEXT[] DEFAULT '{}',
  affected_counties TEXT[] DEFAULT '{}',
  affected_industries TEXT[] DEFAULT '{}',
  affected_modules TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  ai_impact_score INT CHECK (ai_impact_score BETWEEN 0 AND 100),
  ai_urgency TEXT CHECK (ai_urgency IN ('critical','high','medium','low','informational')),
  ai_client_impact TEXT,
  ai_platform_impact TEXT,
  ai_confidence INT CHECK (ai_confidence BETWEEN 0 AND 100),
  ai_analyzed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new','analyzing','analyzed','reviewed','published','dismissed','archived'
  )),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signals_status_idx     ON intelligence_signals (status);
CREATE INDEX IF NOT EXISTS signals_urgency_idx    ON intelligence_signals (ai_urgency);
CREATE INDEX IF NOT EXISTS signals_type_idx       ON intelligence_signals (signal_type);
CREATE INDEX IF NOT EXISTS signals_source_idx     ON intelligence_signals (source_id);
CREATE INDEX IF NOT EXISTS signals_discovered_idx ON intelligence_signals (discovered_at);

-- ── Intelligence Correlations ────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  correlation_type TEXT NOT NULL CHECK (correlation_type IN (
    'organization','location','jurisdiction','county','industry','module','platform'
  )),
  organization_id UUID,
  location_id UUID,
  jurisdiction_key TEXT,
  county TEXT,
  industry TEXT,
  module_id TEXT,
  impact_level TEXT NOT NULL CHECK (impact_level IN ('critical','high','medium','low','monitoring')),
  impact_description TEXT,
  action_required BOOLEAN DEFAULT false,
  action_description TEXT,
  action_due_date DATE,
  action_completed_at TIMESTAMPTZ,
  notification_sent_at TIMESTAMPTZ,
  notification_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS correlations_signal_idx ON intelligence_correlations (signal_id);
CREATE INDEX IF NOT EXISTS correlations_org_idx    ON intelligence_correlations (organization_id);
CREATE INDEX IF NOT EXISTS correlations_action_idx ON intelligence_correlations (action_required);

-- ── JIE Updates Log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS jie_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES intelligence_signals(id),
  jurisdiction_key TEXT NOT NULL,
  jurisdiction_name TEXT,
  update_type TEXT NOT NULL CHECK (update_type IN (
    'scoring_weight_change','grading_scale_change',
    'inspection_frequency_change','new_violation_category',
    'enforcement_priority_shift','methodology_overhaul',
    'fire_code_update','score_table_refresh'
  )),
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  effective_date DATE,
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  published_to_clients BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE intelligence_sources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_signals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jie_updates               ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
  'intelligence_sources','intelligence_signals',
  'intelligence_correlations','jie_updates'
]) LOOP
  EXECUTE format('CREATE POLICY "admin_only" ON %I FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = ''platform_admin''))', t);
  EXECUTE format('CREATE POLICY "service_role_all" ON %I FOR ALL USING (auth.role() = ''service_role'')', t);
END LOOP; END $$;

-- ── Seed: All Intelligence Sources (80+) ─────────────────
INSERT INTO intelligence_sources
  (source_key, name, category, subcategory, url, crawl_method, crawl_frequency, is_demo_critical)
VALUES
  -- California County EH (Food) — all 62 jurisdictions
  ('ca_alameda_eh',      'Alameda County EH',          'jurisdiction_food','county_eh', 'https://www.acgov.org/eh/',                        'html','weekly',false),
  ('ca_alpine_eh',       'Alpine County EH',            'jurisdiction_food','county_eh', 'https://www.alpinecountyca.gov',                    'html','monthly',false),
  ('ca_amador_eh',       'Amador County EH',            'jurisdiction_food','county_eh', 'https://www.amadorgov.org/services/environmental',  'html','monthly',false),
  ('ca_butte_eh',        'Butte County EH',             'jurisdiction_food','county_eh', 'https://www.buttecounty.net/publichealth',          'html','weekly',false),
  ('ca_calaveras_eh',    'Calaveras County EH',         'jurisdiction_food','county_eh', 'https://www.calaveras.ca.gov',                     'html','monthly',false),
  ('ca_colusa_eh',       'Colusa County EH',            'jurisdiction_food','county_eh', 'https://www.countyofcolusa.org',                   'html','monthly',false),
  ('ca_contracosta_eh',  'Contra Costa County EH',      'jurisdiction_food','county_eh', 'https://www.cchealth.org/eh/',                     'html','weekly',false),
  ('ca_delnorte_eh',     'Del Norte County EH',         'jurisdiction_food','county_eh', 'https://www.co.del-norte.ca.us',                   'html','monthly',false),
  ('ca_eldorado_eh',     'El Dorado County EH',         'jurisdiction_food','county_eh', 'https://www.edcgov.us/Government/eh/',             'html','weekly',false),
  ('ca_fresno_eh',       'Fresno County DEH',           'jurisdiction_food','county_eh', 'https://www.co.fresno.ca.us/departments/public-health-and-animal-services/environmental-health', 'html','daily',true),
  ('ca_glenn_eh',        'Glenn County EH',             'jurisdiction_food','county_eh', 'https://www.countyofglenn.net',                    'html','monthly',false),
  ('ca_humboldt_eh',     'Humboldt County EH',          'jurisdiction_food','county_eh', 'https://humboldtgov.org/eh',                       'html','weekly',false),
  ('ca_imperial_eh',     'Imperial County EH',          'jurisdiction_food','county_eh', 'https://www.co.imperial.ca.us',                    'html','monthly',false),
  ('ca_inyo_eh',         'Inyo County EH',              'jurisdiction_food','county_eh', 'https://www.inyocounty.us',                        'html','monthly',false),
  ('ca_kern_eh',         'Kern County EH',              'jurisdiction_food','county_eh', 'https://www.kernpublichealth.com/environmental-health/', 'html','weekly',false),
  ('ca_kings_eh',        'Kings County EH',             'jurisdiction_food','county_eh', 'https://www.countyofkings.com',                    'html','monthly',false),
  ('ca_lake_eh',         'Lake County EH',              'jurisdiction_food','county_eh', 'https://www.lakecountyca.gov',                     'html','monthly',false),
  ('ca_lassen_eh',       'Lassen County EH',            'jurisdiction_food','county_eh', 'https://www.lassencounty.org',                     'html','monthly',false),
  ('ca_la_eh',           'LA County EH',                'jurisdiction_food','county_eh', 'https://ehservices.publichealth.lacounty.gov',     'api','daily',true),
  ('ca_madera_eh',       'Madera County EH',            'jurisdiction_food','county_eh', 'https://www.maderacounty.com/government/public-health/environmental-health', 'html','weekly',false),
  ('ca_marin_eh',        'Marin County EH',             'jurisdiction_food','county_eh', 'https://www.marinhhs.org/environmental-health',   'html','weekly',false),
  ('ca_mariposa_eh',     'Mariposa County EH',          'jurisdiction_food','county_eh', 'https://www.mariposacounty.org',                   'html','weekly',true),
  ('ca_mendocino_eh',    'Mendocino County EH',         'jurisdiction_food','county_eh', 'https://www.mendocinocounty.org/eh',               'html','weekly',false),
  ('ca_merced_eh',       'Merced County DEH',           'jurisdiction_food','county_eh', 'https://www.co.merced.ca.us/127/Environmental-Health', 'html','daily',true),
  ('ca_modoc_eh',        'Modoc County EH',             'jurisdiction_food','county_eh', 'https://www.co.modoc.ca.us',                       'html','monthly',false),
  ('ca_mono_eh',         'Mono County EH',              'jurisdiction_food','county_eh', 'https://monocounty.ca.gov',                        'html','monthly',false),
  ('ca_monterey_eh',     'Monterey County EH',          'jurisdiction_food','county_eh', 'https://www.co.monterey.ca.us/government/departments-a-h/environmental-health', 'html','weekly',false),
  ('ca_napa_eh',         'Napa County EH',              'jurisdiction_food','county_eh', 'https://www.countyofnapa.org/eh',                  'html','weekly',false),
  ('ca_nevada_eh',       'Nevada County EH',            'jurisdiction_food','county_eh', 'https://www.mynevadacounty.com/eh',                'html','weekly',false),
  ('ca_orange_eh',       'Orange County EH',            'jurisdiction_food','county_eh', 'https://ocehsa.com',                               'html','daily',false),
  ('ca_placer_eh',       'Placer County EH',            'jurisdiction_food','county_eh', 'https://www.placer.ca.gov/departments/health/environmental-health', 'html','weekly',false),
  ('ca_plumas_eh',       'Plumas County EH',            'jurisdiction_food','county_eh', 'https://www.plumascounty.us',                      'html','monthly',false),
  ('ca_riverside_eh',    'Riverside County EH',         'jurisdiction_food','county_eh', 'https://www.rivcoeeh.org',                         'html','daily',false),
  ('ca_sacramento_eh',   'Sacramento County EH',        'jurisdiction_food','county_eh', 'https://www.saccounty.net/environmental-management/', 'html','daily',false),
  ('ca_sanbenito_eh',    'San Benito County EH',        'jurisdiction_food','county_eh', 'https://www.cosb.us',                              'html','monthly',false),
  ('ca_sanbernardino_eh','San Bernardino County EH',    'jurisdiction_food','county_eh', 'https://wp.sbcounty.gov/dph/environmental/',       'html','daily',false),
  ('ca_sandiego_eh',     'San Diego County EH',         'jurisdiction_food','county_eh', 'https://www.sandiegocounty.gov/content/sdc/deh.html', 'html','daily',true),
  ('ca_sanfrancisco_eh', 'San Francisco DPH EH',        'jurisdiction_food','county_eh', 'https://www.sfdph.org/dph/EH/',                    'html','daily',false),
  ('ca_sanjoaquin_eh',   'San Joaquin County EH',       'jurisdiction_food','county_eh', 'https://www.sjcphs.org',                           'html','daily',true),
  ('ca_sanluisobispo_eh','San Luis Obispo County EH',   'jurisdiction_food','county_eh', 'https://www.slocounty.ca.gov/Departments/Health-Agency/Environmental-Health.aspx', 'html','weekly',false),
  ('ca_sanmateo_eh',     'San Mateo County EH',         'jurisdiction_food','county_eh', 'https://www.smchealth.org/environmental-health',  'html','weekly',false),
  ('ca_santabarbara_eh', 'Santa Barbara County EH',     'jurisdiction_food','county_eh', 'https://www.countyofsb.org/phd/eh.sbc',            'html','weekly',false),
  ('ca_santaclara_eh',   'Santa Clara County EH',       'jurisdiction_food','county_eh', 'https://www.sccgov.org/sites/scc/depts/Sch/Pages/eh.aspx', 'html','daily',false),
  ('ca_santacruz_eh',    'Santa Cruz County EH',        'jurisdiction_food','county_eh', 'https://www.scceh.com',                            'html','weekly',false),
  ('ca_shasta_eh',       'Shasta County EH',            'jurisdiction_food','county_eh', 'https://www.shastacounty.gov/hhsa',                'html','weekly',false),
  ('ca_sierra_eh',       'Sierra County EH',            'jurisdiction_food','county_eh', 'https://www.sierracounty.ca.gov',                  'html','monthly',false),
  ('ca_siskiyou_eh',     'Siskiyou County EH',          'jurisdiction_food','county_eh', 'https://www.co.siskiyou.ca.us',                    'html','monthly',false),
  ('ca_solano_eh',       'Solano County EH',            'jurisdiction_food','county_eh', 'https://www.solanocounty.com/depts/rm/eh/default.asp', 'html','weekly',false),
  ('ca_sonoma_eh',       'Sonoma County EH',            'jurisdiction_food','county_eh', 'https://sonomacounty.ca.gov/health-and-human-services/health-services/environmental-health', 'html','weekly',false),
  ('ca_stanislaus_eh',   'Stanislaus County EH',        'jurisdiction_food','county_eh', 'https://www.stanislausehd.org',                    'html','daily',true),
  ('ca_sutter_eh',       'Sutter County EH',            'jurisdiction_food','county_eh', 'https://www.suttercounty.net',                     'html','weekly',false),
  ('ca_tehama_eh',       'Tehama County EH',            'jurisdiction_food','county_eh', 'https://www.co.tehama.ca.us',                      'html','monthly',false),
  ('ca_trinity_eh',      'Trinity County EH',           'jurisdiction_food','county_eh', 'https://www.trinitycounty.org',                    'html','monthly',false),
  ('ca_tulare_eh',       'Tulare County EH',            'jurisdiction_food','county_eh', 'https://www.tularehhsa.org/eh/',                   'html','weekly',false),
  ('ca_tuolumne_eh',     'Tuolumne County EH',          'jurisdiction_food','county_eh', 'https://www.tuolumnecounty.ca.gov',                'html','monthly',false),
  ('ca_ventura_eh',      'Ventura County EH',           'jurisdiction_food','county_eh', 'https://vcrma.org/divisions/environmental-health', 'html','weekly',false),
  ('ca_yolo_eh',         'Yolo County EH',              'jurisdiction_food','county_eh', 'https://www.yolocounty.org/general-government/general-government-departments/environmental-health-services', 'html','weekly',false),
  ('ca_yuba_eh',         'Yuba County EH',              'jurisdiction_food','county_eh', 'https://www.yubacounty.net',                       'html','weekly',false),
  -- Special jurisdictions
  ('nps_yosemite',       'NPS Yosemite (FDA Food Code 2022)','jurisdiction_food','federal_land', 'https://www.nps.gov/yose/', 'html','weekly',true),
  -- State agencies
  ('ca_cdph',            'CA CDPH Food Safety',         'state_agency','food_safety',   'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram/RetailFoodSafety.aspx', 'html','daily',true),
  ('ca_osfm',            'CA OSFM',                     'state_agency','fire_safety',   'https://osfm.fire.ca.gov',                         'firecrawl','daily',true),
  ('ca_calfire',         'CalFire',                      'state_agency','fire_safety',   'https://www.fire.ca.gov',                          'firecrawl','daily',true),
  ('ca_abc',             'CA Dept of Alcoholic Beverages','state_agency','licensing',    'https://www.abc.ca.gov',                           'html','weekly',false),
  ('ca_legislature',     'CA Legislature (Food/Fire bills)','legislative','state_bills', 'https://leginfo.legislature.ca.gov',               'api','daily',true),
  ('ca_calcode',         'CA Retail Food Code (CalCode)','state_agency','food_code',     'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=113700', 'html','weekly',true),
  -- Federal agencies
  ('fda_food_safety',    'FDA Food Safety & Applied Nutrition','federal_agency','food_safety','https://www.fda.gov/food',                     'rss','daily',true),
  ('fda_recalls',        'FDA Food Recalls',            'federal_agency','recalls',     'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts', 'rss','realtime',true),
  ('usda_fsis',          'USDA FSIS Recalls',           'federal_agency','recalls',     'https://www.fsis.usda.gov/recalls',                'rss','realtime',true),
  ('cdc_outbreaks',      'CDC Foodborne Outbreaks',     'federal_agency','outbreaks',   'https://www.cdc.gov/foodsafety/outbreaks/',        'html','daily',true),
  ('osha_restaurant',    'OSHA Restaurant/Food Safety', 'federal_agency','workplace',   'https://www.osha.gov/restaurant',                 'html','weekly',false),
  ('nps_regulations',    'NPS Food Service Regulations','federal_agency','federal_land', 'https://www.nps.gov/subjects/foodsafety/',        'html','weekly',true),
  -- Industry standards
  ('nfpa_96',            'NFPA 96 (Hood Cleaning Standard)','industry','fire_standards', 'https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=96', 'html','monthly',true),
  ('nfpa_10',            'NFPA 10 (Portable Extinguishers)','industry','fire_standards', 'https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10', 'html','monthly',false),
  ('nfpa_13',            'NFPA 13 (Sprinkler Systems)', 'industry','fire_standards',     'https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=13', 'html','monthly',false),
  ('nfpa_72',            'NFPA 72 (Fire Alarm Code)',   'industry','fire_standards',     'https://www.nfpa.org',                             'html','monthly',false),
  ('ikeca',              'IKECA (Hood Cleaning Industry)','industry','trade_org',        'https://www.ikeca.org',                            'html','monthly',true),
  ('nsf_international',  'NSF International Food Standards','industry','food_standards', 'https://www.nsf.org/consumer-resources/articles/food-equipment-standards', 'html','monthly',false),
  ('nra_restaurant',     'National Restaurant Association','industry','trade_org',       'https://restaurant.org',                           'rss','weekly',false),
  -- Insurance
  ('ca_doi',             'CA Dept of Insurance',        'insurance','regulatory',       'https://www.insurance.ca.gov',                    'html','weekly',false),
  -- Competitive
  ('competitor_watch',   'Competitor Activity Monitor', 'competitive','market',          null,                                              'manual','manual',false),
  -- Trade press
  ('food_safety_news',   'Food Safety News',            'news','trade_press',           'https://www.foodsafetynews.com/feed/',             'rss','daily',false),
  ('restaurant_biz',     'Restaurant Business Online',  'news','trade_press',           'https://www.restaurantbusinessonline.com/rss',     'rss','daily',false)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  url  = EXCLUDED.url;
