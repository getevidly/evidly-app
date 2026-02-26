-- ============================================================================
-- RFP Intelligence Monitor
-- Migration: 20260326000000_rfp_intelligence.sql
--
-- Creates 4 tables for tracking procurement opportunities:
--   1. rfp_sources        — procurement portal registry
--   2. rfp_listings       — discovered RFPs
--   3. rfp_classifications — AI analysis results
--   4. rfp_actions        — admin tracking
--
-- Includes RLS policies, indexes, trigger, and 100 seed sources.
-- ============================================================================

-- ============================================================================
-- TABLE 1: rfp_sources — procurement portal registry
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfp_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('government','k12','healthcare','enterprise')),
  coverage TEXT NOT NULL DEFAULT 'state' CHECK (coverage IN ('national','state','county','district')),
  states_covered JSONB,
  crawl_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (crawl_frequency IN ('daily','weekly')),
  last_crawled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','error')),
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE 2: rfp_listings — discovered RFPs
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfp_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES rfp_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  issuing_entity TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'state' CHECK (entity_type IN ('federal','state','county','city','school_district','healthcare_system','enterprise')),
  state TEXT,
  county TEXT,
  city TEXT,
  region TEXT,
  url TEXT,
  document_urls JSONB DEFAULT '[]',
  posted_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  estimated_value NUMERIC(14,2),
  naics_code TEXT,
  set_aside_type TEXT CHECK (set_aside_type IS NULL OR set_aside_type IN ('small_business','veteran','8a','hubzone','wosb','sdvosb','none','unknown')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','awarded','unknown')),
  raw_content TEXT,
  dedup_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE 3: rfp_classifications — AI analysis results
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfp_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES rfp_listings(id) ON DELETE CASCADE,
  relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
  relevance_tier TEXT NOT NULL CHECK (relevance_tier IN ('high','medium','low','irrelevant')),
  matched_modules TEXT[] NOT NULL DEFAULT '{}',
  matched_keywords TEXT[] NOT NULL DEFAULT '{}',
  competition_notes TEXT,
  recommended_action TEXT NOT NULL DEFAULT 'skip' CHECK (recommended_action IN ('pursue','monitor','skip')),
  ai_reasoning TEXT NOT NULL,
  classification_model_version TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  tokens_used INTEGER NOT NULL DEFAULT 0,
  classification_cost NUMERIC(8,6) NOT NULL DEFAULT 0,
  classified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE 4: rfp_actions — admin tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfp_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES rfp_listings(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('pursuing','proposal_submitted','won','lost','declined','watching')),
  notes TEXT,
  assigned_to TEXT,
  deadline TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE rfp_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_actions ENABLE ROW LEVEL SECURITY;

-- rfp_sources policies
DO $$ BEGIN
  CREATE POLICY "rfp_sources_select_authenticated" ON rfp_sources FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rfp_sources_service_role_all" ON rfp_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rfp_listings policies
DO $$ BEGIN
  CREATE POLICY "rfp_listings_select_authenticated" ON rfp_listings FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rfp_listings_service_role_all" ON rfp_listings FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rfp_classifications policies
DO $$ BEGIN
  CREATE POLICY "rfp_classifications_select_authenticated" ON rfp_classifications FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rfp_classifications_service_role_all" ON rfp_classifications FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rfp_actions policies
DO $$ BEGIN
  CREATE POLICY "rfp_actions_select_authenticated" ON rfp_actions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rfp_actions_service_role_all" ON rfp_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- rfp_sources indexes
CREATE INDEX IF NOT EXISTS idx_rfp_sources_status ON rfp_sources(status);
CREATE INDEX IF NOT EXISTS idx_rfp_sources_states ON rfp_sources USING GIN (states_covered);

-- rfp_listings indexes
CREATE INDEX IF NOT EXISTS idx_rfp_listings_source ON rfp_listings(source_id);
CREATE INDEX IF NOT EXISTS idx_rfp_listings_state ON rfp_listings(state);
CREATE INDEX IF NOT EXISTS idx_rfp_listings_status ON rfp_listings(status);
CREATE INDEX IF NOT EXISTS idx_rfp_listings_due ON rfp_listings(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rfp_listings_naics ON rfp_listings(naics_code) WHERE naics_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rfp_listings_dedup ON rfp_listings(dedup_hash) WHERE dedup_hash IS NOT NULL;

-- rfp_classifications indexes
CREATE INDEX IF NOT EXISTS idx_rfp_class_rfp ON rfp_classifications(rfp_id);
CREATE INDEX IF NOT EXISTS idx_rfp_class_score ON rfp_classifications(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_rfp_class_tier ON rfp_classifications(relevance_tier);

-- rfp_actions indexes
CREATE INDEX IF NOT EXISTS idx_rfp_actions_rfp ON rfp_actions(rfp_id, created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_rfp_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_rfp_actions_updated
    BEFORE UPDATE ON rfp_actions
    FOR EACH ROW EXECUTE FUNCTION update_rfp_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SEED DATA: rfp_sources (100 rows)
-- ============================================================================

-- Only seed if table is empty (avoid duplicates on re-run)
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM rfp_sources LIMIT 1) THEN

-- --------------------------------------------------------------------------
-- FEDERAL SOURCES (6 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'SAM.gov',
  'https://sam.gov',
  'government',
  'national',
  NULL,
  'daily',
  'active',
  '{"api_endpoint":"https://api.sam.gov/opportunities/v2/search","api_key_env":"SAM_GOV_API_KEY","naics_filter":["722310","722511","722513","722514","561720","541512","511210"]}'::jsonb
),
(
  'GSA eBuy',
  'https://www.ebuy.gsa.gov',
  'government',
  'national',
  NULL,
  'daily',
  'active',
  '{"method":"web_scrape","selectors":{"listing":".opportunity-row","title":".opp-title","date":".opp-date"}}'::jsonb
),
(
  'FedBizOpps Archive',
  'https://www.fbo.gov',
  'government',
  'national',
  NULL,
  'daily',
  'paused',
  '{"method":"api","note":"Archived, redirects to SAM.gov"}'::jsonb
),
(
  'Federal Register',
  'https://www.federalregister.gov',
  'government',
  'national',
  NULL,
  'daily',
  'active',
  '{"api_endpoint":"https://www.federalregister.gov/api/v1/documents","keywords":["food service contract","kitchen compliance","food safety"]}'::jsonb
),
(
  'USDA FNS Procurement',
  'https://www.fns.usda.gov/procurement',
  'k12',
  'national',
  NULL,
  'daily',
  'active',
  '{"method":"web_scrape","keywords":["school nutrition","child nutrition","NSLP"]}'::jsonb
),
(
  'DoD Food Service',
  'https://sam.gov',
  'government',
  'national',
  NULL,
  'daily',
  'active',
  '{"api_endpoint":"https://api.sam.gov/opportunities/v2/search","naics_filter":["722310","722514"],"keywords":["dining facility","DFAC","food service"]}'::jsonb
);

-- --------------------------------------------------------------------------
-- STATE PORTALS — ACTIVE (15 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'CaleProcure (California)',
  'https://caleprocure.ca.gov',
  'government',
  'state',
  '["CA"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape","selectors":{"listing":".bid-row"}}'::jsonb
),
(
  'ESBD (Texas)',
  'https://comptroller.texas.gov/purchasing/vendor/esbd/',
  'government',
  'state',
  '["TX"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'MyFloridaMarketPlace (Florida)',
  'https://vendor.myfloridamarketplace.com',
  'government',
  'state',
  '["FL"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'NYS Contract Reporter (New York)',
  'https://www.nyscontractreporter.com',
  'government',
  'state',
  '["NY"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'BidBuy (Illinois)',
  'https://www.bidbuy.illinois.gov',
  'government',
  'state',
  '["IL"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'eMarketplace (Pennsylvania)',
  'https://www.emarketplace.state.pa.us',
  'government',
  'state',
  '["PA"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Ohio Procurement',
  'https://procure.ohio.gov',
  'government',
  'state',
  '["OH"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'GPR (Georgia)',
  'https://ssl.doas.state.ga.us/PRSapp/',
  'government',
  'state',
  '["GA"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'eProcurement (North Carolina)',
  'https://www.ips.state.nc.us/ips/',
  'government',
  'state',
  '["NC"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'SIGMA (Michigan)',
  'https://sigma.michigan.gov',
  'government',
  'state',
  '["MI"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'NJSTART (New Jersey)',
  'https://www.njstart.gov',
  'government',
  'state',
  '["NJ"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'eVA (Virginia)',
  'https://eva.virginia.gov',
  'government',
  'state',
  '["VA"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'WEBS (Washington)',
  'https://pr-webs-vendor.des.wa.gov',
  'government',
  'state',
  '["WA"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'COMMBUYS (Massachusetts)',
  'https://www.commbuys.com',
  'government',
  'state',
  '["MA"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
),
(
  'ProcureAZ (Arizona)',
  'https://procure.az.gov',
  'government',
  'state',
  '["AZ"]'::jsonb,
  'daily',
  'active',
  '{"method":"web_scrape"}'::jsonb
);

-- --------------------------------------------------------------------------
-- STATE PORTALS — PAUSED (35 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'Alabama Purchasing',
  'https://purchasing.alabama.gov',
  'government',
  'state',
  '["AL"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Alaska IRIS',
  'https://iris.alaska.gov',
  'government',
  'state',
  '["AK"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Arkansas DFA Procurement',
  'https://www.arkansas.gov/dfa/procurement',
  'government',
  'state',
  '["AR"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'BidsColorado (Colorado)',
  'https://www.bidscolorado.com',
  'government',
  'state',
  '["CO"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'CT DAS Procurement (Connecticut)',
  'https://portal.ct.gov/DAS/Procurement',
  'government',
  'state',
  '["CT"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Delaware Contracts',
  'https://contracts.delaware.gov',
  'government',
  'state',
  '["DE"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Hawaii eProcurement (HANDS)',
  'https://hands.ehawaii.gov',
  'government',
  'state',
  '["HI"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Idaho Purchasing',
  'https://purchasing.idaho.gov',
  'government',
  'state',
  '["ID"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Indiana IDOA Procurement',
  'https://www.in.gov/idoa/procurement',
  'government',
  'state',
  '["IN"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Iowa Bid Opportunities',
  'https://bidopportunities.iowa.gov',
  'government',
  'state',
  '["IA"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Kansas Procurement & Contracts',
  'https://admin.ks.gov/offices/procurement-and-contracts',
  'government',
  'state',
  '["KS"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Kentucky eProcurement',
  'https://eprocurement.ky.gov',
  'government',
  'state',
  '["KY"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Louisiana LaPAC',
  'https://wwwcfprd.doa.louisiana.gov/osp/lapac/pubmain.cfm',
  'government',
  'state',
  '["LA"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Maine Purchases',
  'https://www.maine.gov/purchases',
  'government',
  'state',
  '["ME"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'eMaryland (Maryland)',
  'https://emaryland.buyspeed.com',
  'government',
  'state',
  '["MD"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Minnesota Procurement',
  'https://mn.gov/admin/government/procurement',
  'government',
  'state',
  '["MN"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Mississippi DFA Purchasing',
  'https://www.dfa.ms.gov/purchasing-travel-and-fleet-management',
  'government',
  'state',
  '["MS"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Missouri Procurement',
  'https://www.mo.gov/government/procurement',
  'government',
  'state',
  '["MO"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Montana Vendor Services',
  'https://vendorservices.mt.gov',
  'government',
  'state',
  '["MT"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Nebraska Materiel Purchasing',
  'https://das.nebraska.gov/materiel/purchasing.html',
  'government',
  'state',
  '["NE"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Nevada State Purchasing',
  'https://purchasing.state.nv.us',
  'government',
  'state',
  '["NV"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'New Hampshire Bids & Contracts',
  'https://apps.das.nh.gov/bidscontracts',
  'government',
  'state',
  '["NH"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'New Mexico General Services',
  'https://www.generalservices.state.nm.us',
  'government',
  'state',
  '["NM"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'North Dakota Procurement',
  'https://www.nd.gov/omb/vendor/state-procurement',
  'government',
  'state',
  '["ND"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Oklahoma OMES Purchasing',
  'https://oklahoma.gov/omes/services/purchasing.html',
  'government',
  'state',
  '["OK"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'ORPIN (Oregon)',
  'https://orpin.oregon.gov',
  'government',
  'state',
  '["OR"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Rhode Island Purchasing',
  'https://purchasing.ri.gov',
  'government',
  'state',
  '["RI"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'South Carolina Procurement',
  'https://procurement.sc.gov',
  'government',
  'state',
  '["SC"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'South Dakota Bureau of Procurement',
  'https://bop.sd.gov',
  'government',
  'state',
  '["SD"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Tennessee General Services Procurement',
  'https://www.tn.gov/generalservices/procurement',
  'government',
  'state',
  '["TN"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Utah Purchasing',
  'https://purchasing.utah.gov',
  'government',
  'state',
  '["UT"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Vermont Purchasing & Contracting',
  'https://bgs.vermont.gov/purchasing-contracting',
  'government',
  'state',
  '["VT"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'West Virginia Purchasing',
  'https://www.state.wv.us/admin/purchase',
  'government',
  'state',
  '["WV"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'VendorNet (Wisconsin)',
  'https://vendornet.wi.gov',
  'government',
  'state',
  '["WI"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
),
(
  'Wyoming Procurement',
  'https://ai.wyo.gov/procurement',
  'government',
  'state',
  '["WY"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape"}'::jsonb
);

-- --------------------------------------------------------------------------
-- AGGREGATORS (5 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'BidNet Direct',
  'https://www.bidnet.com',
  'government',
  'national',
  NULL,
  'daily',
  'active',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition","cafeteria"]}'::jsonb
),
(
  'PublicPurchase',
  'https://www.publicpurchase.com',
  'government',
  'national',
  NULL,
  'daily',
  'active',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition","cafeteria"]}'::jsonb
),
(
  'GovWin (Deltek)',
  'https://iq.govwin.com',
  'government',
  'national',
  NULL,
  'daily',
  'paused',
  '{"method":"api","note":"Requires paid subscription","keywords":["food service","kitchen compliance"]}'::jsonb
),
(
  'BidPlanet',
  'https://www.bidplanet.com',
  'government',
  'national',
  NULL,
  'daily',
  'active',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'Merx',
  'https://www.merx.com',
  'government',
  'national',
  NULL,
  'daily',
  'paused',
  '{"method":"web_scrape","note":"Canada-focused, limited US coverage"}'::jsonb
);

-- --------------------------------------------------------------------------
-- K-12 SCHOOL DISTRICTS (10 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'Los Angeles USD',
  'https://achieve.lausd.net/procurement',
  'k12',
  'district',
  '["CA"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","nutrition","cafeteria","meal program"]}'::jsonb
),
(
  'NYC DOE',
  'https://www.schools.nyc.gov/about-us/doing-business-with-us',
  'k12',
  'district',
  '["NY"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","nutrition","school meals"]}'::jsonb
),
(
  'Chicago Public Schools',
  'https://www.cps.edu/about/doing-business-with-cps/procurement-opportunities',
  'k12',
  'district',
  '["IL"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","nutrition","cafeteria"]}'::jsonb
),
(
  'Miami-Dade County Public Schools',
  'https://procurement.dadeschools.net',
  'k12',
  'district',
  '["FL"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","nutrition","cafeteria"]}'::jsonb
),
(
  'Clark County School District (Las Vegas)',
  'https://www.ccsd.net/departments/purchasing',
  'k12',
  'district',
  '["NV"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","nutrition","cafeteria"]}'::jsonb
),
(
  'Houston ISD',
  'https://www.houstonisd.org/procurement',
  'k12',
  'district',
  '["TX"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","nutrition","cafeteria"]}'::jsonb
),
(
  'Hillsborough County Public Schools',
  'https://www.hillsboroughschools.org/Page/29211',
  'k12',
  'district',
  '["FL"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","nutrition","cafeteria"]}'::jsonb
),
(
  'USDA FNS School Nutrition',
  'https://www.fns.usda.gov/cn',
  'k12',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["school nutrition","NSLP","child nutrition","school breakfast"]}'::jsonb
),
(
  'School Nutrition Association',
  'https://schoolnutrition.org/vendor-opportunities',
  'k12',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["vendor opportunities","food service","nutrition"]}'::jsonb
),
(
  'CA Dept of Education Nutrition',
  'https://www.cde.ca.gov/ls/nu/fd',
  'k12',
  'district',
  '["CA"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["school nutrition","food distribution","NSLP"]}'::jsonb
);

-- --------------------------------------------------------------------------
-- HEALTHCARE (8 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'VA Medical Centers',
  'https://sam.gov',
  'healthcare',
  'national',
  NULL,
  'daily',
  'active',
  '{"api_endpoint":"https://api.sam.gov/opportunities/v2/search","keywords":["dietary","food service","nutrition"],"agency":"VA"}'::jsonb
),
(
  'Kaiser Permanente Procurement',
  'https://supplier.kp.org',
  'healthcare',
  'state',
  '["CA","OR","WA","CO","GA","VA","MD","DC","HI"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","dietary","nutrition","cafeteria"]}'::jsonb
),
(
  'HCA Healthcare',
  'https://hcahealthcare.com/about/procurement.dot',
  'healthcare',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","dietary","nutrition"]}'::jsonb
),
(
  'Ascension Health',
  'https://ascension.org/Our-Work/Supply-Chain',
  'healthcare',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","dietary","nutrition"]}'::jsonb
),
(
  'CommonSpirit Health',
  'https://www.commonspirit.org/what-we-do/supply-chain',
  'healthcare',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","dietary","nutrition"]}'::jsonb
),
(
  'Sutter Health',
  'https://www.sutterhealth.org/about/suppliers',
  'healthcare',
  'state',
  '["CA"]'::jsonb,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","dietary","nutrition"]}'::jsonb
),
(
  'Trinity Health',
  'https://www.trinity-health.org/about-us/supply-chain',
  'healthcare',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","dietary","nutrition"]}'::jsonb
),
(
  'Tenet Healthcare',
  'https://www.tenethealth.com/about/supply-chain',
  'healthcare',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","dietary","nutrition"]}'::jsonb
);

-- --------------------------------------------------------------------------
-- ENTERPRISE (6 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'Aramark',
  'https://www.aramark.com/about-us/suppliers',
  'enterprise',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["supplier","vendor","food service technology","compliance"]}'::jsonb
),
(
  'Sodexo',
  'https://us.sodexo.com/inspired-thinking/business-partnerships.html',
  'enterprise',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["supplier","vendor","food service technology","compliance"]}'::jsonb
),
(
  'Compass Group / Chartwells',
  'https://www.compass-group.com/en/suppliers.html',
  'enterprise',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["supplier","vendor","food service technology"]}'::jsonb
),
(
  'Elior Group',
  'https://www.eliorgroup.com/suppliers',
  'enterprise',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["supplier","vendor","food service technology"]}'::jsonb
),
(
  'Delaware North',
  'https://www.delawarenorth.com/suppliers',
  'enterprise',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["supplier","vendor","food service","hospitality"]}'::jsonb
),
(
  'NPS Concessionaires',
  'https://www.nps.gov/subjects/concessions/prospectus.htm',
  'enterprise',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["concession","food service","prospectus"]}'::jsonb
);

-- --------------------------------------------------------------------------
-- MILITARY / GOVERNMENT FACILITIES (3 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'AAFES Procurement',
  'https://www.aafes.com/exchange-stores/doing-business-with-us/',
  'government',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","food court","dining","exchange"]}'::jsonb
),
(
  'Federal BOP Food Service',
  'https://www.bop.gov/business/',
  'government',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","commissary","dietary","inmate meals"]}'::jsonb
),
(
  'Defense Commissary Agency',
  'https://www.commissaries.com/our-agency/doing-business-with-deca',
  'government',
  'national',
  NULL,
  'weekly',
  'active',
  '{"method":"web_scrape","keywords":["food service","commissary","vendor","supplier"]}'::jsonb
);

-- --------------------------------------------------------------------------
-- ADDITIONAL STATE / REGIONAL / COUNTY (12 rows)
-- --------------------------------------------------------------------------
INSERT INTO rfp_sources (name, url, source_type, coverage, states_covered, crawl_frequency, status, config_json) VALUES
(
  'County of Los Angeles',
  'https://camisvr.co.la.ca.us/lacobids',
  'government',
  'county',
  '["CA"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'City of New York',
  'https://a856-cityrecord.nyc.gov',
  'government',
  'county',
  '["NY"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'City of Chicago',
  'https://www.chicago.gov/city/en/depts/dps.html',
  'government',
  'county',
  '["IL"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'Cook County IL',
  'https://www.cookcountyil.gov/service/procurement',
  'government',
  'county',
  '["IL"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'Maricopa County AZ',
  'https://www.maricopa.gov/631/Procurement-Services',
  'government',
  'county',
  '["AZ"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'Harris County TX',
  'https://purchasing.harriscountytx.gov',
  'government',
  'county',
  '["TX"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'San Diego County',
  'https://www.sandiegocounty.gov/content/sdc/purchasing.html',
  'government',
  'county',
  '["CA"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'King County WA',
  'https://kingcounty.gov/depts/finance-business-operations/procurement.aspx',
  'government',
  'county',
  '["WA"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'Broward County FL',
  'https://www.broward.org/Purchasing',
  'government',
  'county',
  '["FL"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'Palm Beach County FL',
  'https://discover.pbcgov.org/purchasing',
  'government',
  'county',
  '["FL"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","kitchen","dietary","nutrition"]}'::jsonb
),
(
  'State of Oregon Corrections',
  'https://www.oregon.gov/doc',
  'government',
  'state',
  '["OR"]'::jsonb,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["food service","dietary","inmate meals","commissary"]}'::jsonb
),
(
  'CMS Dietary Services',
  'https://www.cms.gov/medicare/health-safety-standards',
  'healthcare',
  'national',
  NULL,
  'weekly',
  'paused',
  '{"method":"web_scrape","keywords":["dietary","food service","long-term care","nursing facility"]}'::jsonb
);

END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
