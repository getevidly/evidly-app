-- ════════════════════════════════════════════════════════════
-- RESEED INTELLIGENCE SOURCES
--
-- The original INSERT in 20260506000000_intelligence_system.sql
-- silently failed because source_key column didn't exist yet
-- (it was added later by 20260506100000_schema_align).
-- This migration re-runs the 80+ source seed.
-- ════════════════════════════════════════════════════════════

-- ── Step 1: Backfill source_keys on old rows so UNIQUE constraint is satisfied ──
UPDATE intelligence_sources
SET source_key = id
WHERE source_key IS NULL;

-- ── Step 2: Fix old category values to match CATEGORY_META in the UI ──
UPDATE intelligence_sources SET category = 'jurisdiction_food' WHERE category = 'food_safety';
UPDATE intelligence_sources SET category = 'jurisdiction_fire' WHERE category = 'fire_safety';
UPDATE intelligence_sources SET category = 'federal_agency'    WHERE category IN ('fda_recalls');
UPDATE intelligence_sources SET category = 'state_agency'      WHERE category IN ('regulatory', 'labor', 'environmental');
UPDATE intelligence_sources SET category = 'news'              WHERE category IN ('weather');
-- 'legislative', 'competitive', 'rfp' already match or map naturally

-- ── Step 3: Fix old status values to match STATUS_COLORS in the UI ──
UPDATE intelligence_sources SET status = 'active' WHERE status = 'live';
UPDATE intelligence_sources SET status = 'broken' WHERE status IN ('degraded', 'timeout', 'error', 'disabled');

-- ── Step 4: Insert the 80+ sources from intelligence_system.sql ──
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
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  url = EXCLUDED.url,
  crawl_method = EXCLUDED.crawl_method,
  crawl_frequency = EXCLUDED.crawl_frequency,
  is_demo_critical = EXCLUDED.is_demo_critical;
