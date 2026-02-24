-- ═══════════════════════════════════════════════════════════════════════
-- INTEL-PIPELINE-1: Intelligence Pipeline Tables + Seed Data
-- 3 tables: intelligence_insights, executive_snapshots, intelligence_subscriptions
-- Seed: 15 demo insights + 1 executive snapshot
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════
-- TABLE 1: intelligence_insights
-- Stores both AI-analyzed external intelligence and admin-curated insights.
-- Pipeline: raw API data → Claude transform → pending_review → published
-- Demo insights: organization_id IS NULL, is_demo_eligible = true
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS intelligence_insights (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── PIPELINE METADATA ──
  organization_id             UUID,
  source_id                   TEXT NOT NULL DEFAULT 'manual',
  source_url                  TEXT,
  raw_source_data             JSONB NOT NULL DEFAULT '{}',
  status                      TEXT NOT NULL DEFAULT 'pending_review'
                              CHECK (status IN ('pending_review','approved','published','rejected')),
  is_demo_eligible            BOOLEAN NOT NULL DEFAULT false,

  -- ── INSIGHT CONTENT (matches IntelligenceInsight TypeScript type) ──
  source_type                 TEXT NOT NULL,
  category                    TEXT NOT NULL,
  impact_level                TEXT NOT NULL CHECK (impact_level IN ('critical','high','medium','low')),
  urgency                     TEXT NOT NULL CHECK (urgency IN ('immediate','urgent','standard','informational')),
  title                       TEXT NOT NULL,
  headline                    TEXT NOT NULL,
  summary                     TEXT NOT NULL,
  full_analysis               TEXT NOT NULL DEFAULT '',
  executive_brief             TEXT NOT NULL DEFAULT '',
  action_items                JSONB NOT NULL DEFAULT '[]',
  affected_pillars            TEXT[] NOT NULL DEFAULT '{}',
  affected_counties           TEXT[] NOT NULL DEFAULT '{}',
  confidence_score            NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  tags                        TEXT[] NOT NULL DEFAULT '{}',
  estimated_cost_impact       JSONB NOT NULL DEFAULT '{}',
  published_at                TIMESTAMPTZ,
  source_name                 TEXT NOT NULL DEFAULT '',
  market_signal_strength      TEXT NOT NULL DEFAULT 'moderate'
                              CHECK (market_signal_strength IN ('strong','moderate','weak')),
  personalized_business_impact JSONB,

  -- ── APPROVAL WORKFLOW ──
  reviewed_by                 TEXT,
  reviewed_at                 TIMESTAMPTZ,
  rejected_reason             TEXT,
  demo_priority               INTEGER NOT NULL DEFAULT 0,

  -- ── TIMESTAMPS ──
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intel_insights_status      ON intelligence_insights(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_insights_org          ON intelligence_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_intel_insights_demo         ON intelligence_insights(is_demo_eligible) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_intel_insights_source       ON intelligence_insights(source_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_intel_insights_source_url ON intelligence_insights(source_url) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intel_insights_counties     ON intelligence_insights USING GIN (affected_counties);
CREATE INDEX IF NOT EXISTS idx_intel_insights_impact       ON intelligence_insights(impact_level) WHERE status = 'published';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_intelligence_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER intelligence_insights_updated_at
  BEFORE UPDATE ON intelligence_insights
  FOR EACH ROW EXECUTE FUNCTION update_intelligence_insights_updated_at();


-- ═══════════════════════════════════════════════════════════
-- TABLE 2: executive_snapshots
-- Full ExecutiveSnapshot objects stored as JSONB content
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS executive_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID,
  is_demo_eligible BOOLEAN NOT NULL DEFAULT false,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  content          JSONB NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_snapshots_org  ON executive_snapshots(organization_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exec_snapshots_demo ON executive_snapshots(is_demo_eligible) WHERE status = 'published';


-- ═══════════════════════════════════════════════════════════
-- TABLE 3: intelligence_subscriptions
-- Per-org intelligence delivery preferences
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS intelligence_subscriptions (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               UUID NOT NULL UNIQUE,
  active_sources                TEXT[] NOT NULL DEFAULT '{}',
  alert_severity                TEXT[] NOT NULL DEFAULT '{critical,high,medium}',
  pillar_focus                  TEXT NOT NULL DEFAULT 'both'
                                CHECK (pillar_focus IN ('food_safety','fire_safety','both')),
  competitor_radius_miles       INTEGER NOT NULL DEFAULT 5,
  delivery_email                BOOLEAN NOT NULL DEFAULT true,
  delivery_email_frequency      TEXT NOT NULL DEFAULT 'daily'
                                CHECK (delivery_email_frequency IN ('immediate','daily','weekly')),
  delivery_sms                  BOOLEAN NOT NULL DEFAULT false,
  delivery_sms_threshold        TEXT NOT NULL DEFAULT 'critical'
                                CHECK (delivery_sms_threshold IN ('critical','high')),
  executive_snapshot_frequency  TEXT NOT NULL DEFAULT 'weekly'
                                CHECK (executive_snapshot_frequency IN ('daily','weekly','monthly')),
  executive_snapshot_recipients TEXT[] NOT NULL DEFAULT '{}',
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_intelligence_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER intelligence_subscriptions_updated_at
  BEFORE UPDATE ON intelligence_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_intelligence_subscriptions_updated_at();


-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE intelligence_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_subscriptions ENABLE ROW LEVEL SECURITY;

-- intelligence_insights: anon + authenticated can read published demo-eligible rows
CREATE POLICY "Anyone can read published demo-eligible insights"
  ON intelligence_insights FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND is_demo_eligible = true
  );

-- intelligence_insights: authenticated users can read their org's published insights
CREATE POLICY "Users can read their org published insights"
  ON intelligence_insights FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- intelligence_insights: service role bypass
CREATE POLICY "Service role manages all insights"
  ON intelligence_insights FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- executive_snapshots: anon + authenticated can read published demo-eligible
CREATE POLICY "Anyone can read published demo-eligible snapshots"
  ON executive_snapshots FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND is_demo_eligible = true
  );

-- executive_snapshots: authenticated users can read their org's snapshots
CREATE POLICY "Users can read their org snapshots"
  ON executive_snapshots FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- executive_snapshots: service role bypass
CREATE POLICY "Service role manages all snapshots"
  ON executive_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- intelligence_subscriptions: users can manage their org's subscription
CREATE POLICY "Users can read their org subscription"
  ON intelligence_subscriptions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upsert their org subscription"
  ON intelligence_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org subscription"
  ON intelligence_subscriptions FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- intelligence_subscriptions: service role bypass
CREATE POLICY "Service role manages all subscriptions"
  ON intelligence_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════
-- SEED: 15 Demo Intelligence Insights
-- status='published', is_demo_eligible=true, organization_id=NULL
-- ═══════════════════════════════════════════════════════════

INSERT INTO intelligence_insights (id, source_id, source_type, category, impact_level, urgency, title, headline, summary, full_analysis, executive_brief, action_items, affected_pillars, affected_counties, confidence_score, tags, estimated_cost_impact, published_at, source_name, market_signal_strength, personalized_business_impact, status, is_demo_eligible) VALUES

-- 1: Fresno Hood Cleaning Citations
('d1000000-0000-0000-0000-000000000001', 'manual', 'health_dept', 'enforcement_surge', 'high', 'urgent',
 'Fresno County Hood Cleaning Citations Up 47% in Q1 2026',
 'Fresno inspectors are citing hood cleaning violations at nearly double the normal rate — review your schedule now.',
 'Fresno County Environmental Health has issued 47% more hood cleaning citations in Q1 2026 compared to Q1 2025. Three Central Valley chains have received closure warnings. Inspectors are specifically targeting grease accumulation above Type I hoods and inadequate cleaning frequency documentation.',
 'Fresno County Environmental Health data from January 1 through February 15, 2026 shows 47% more hood cleaning and exhaust system citations versus the same period in 2025. This surge appears tied to a new lead inspector (Inspector Martinez, Badge #847) who has been conducting follow-up visits specifically to verify NFPA 96 compliance. Three multi-location chains in the Central Valley have received formal closure warnings after failing to produce adequate cleaning frequency documentation.\n\nThe enforcement pattern suggests a shift from visual-only inspections to documentation-heavy audits. Inspectors are requesting signed cleaning certificates with grease weight measurements — a requirement that many operators are unaware of. Operations with proper documentation are passing without issue, while those relying on verbal confirmations or informal scheduling are receiving citations at a significantly higher rate.',
 'Fresno County enforcement surge creates material compliance risk for multi-location operators in the region. Financial exposure from closure orders and emergency re-cleaning ranges from $8,000-$45,000 per affected location.',
 '["Pull your hood cleaning logs for all Fresno locations today","Verify cleaning frequency meets NFPA 96 Table 12.4 for your cooking volume","Confirm your vendor has documentation of last service with grease weight recorded","Schedule an unannounced self-inspection using the Fire Safety checklist this week","Brief your kitchen managers on what inspectors are specifically looking for"]',
 '{fire_safety}', '{fresno}', 0.82,
 '{hood cleaning,NFPA 96,Fresno,enforcement,fire safety}',
 '{"low":2500,"high":45000,"currency":"USD","methodology":"Based on closure order frequency and emergency service costs"}',
 '2026-02-20T08:00:00Z', 'Fresno County Environmental Health', 'strong',
 '{"relevance_score":0.82,"business_context":"Fresno County''s 47% hood cleaning enforcement surge directly impacts your Fresno Convention Center Catering operation. With hood cleaning approaching threshold at that location, you are in the primary enforcement zone during peak citation activity.","affected_locations":[{"name":"Fresno Convention Center Catering","impact":"Direct exposure — hood cleaning approaching threshold in active enforcement zone","risk_level":"high"}],"financial_impact_adjusted":{"low":5000,"high":90000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 1 affected Fresno location"},"personalized_actions":["Pull hood cleaning logs for Fresno Convention Center today — last service may be approaching NFPA 96 threshold","Verify your Fresno hood cleaning vendor has documentation with grease weight measurements","Cross-check Yosemite NPS locations for similar documentation gaps before they become an issue"],"industry_specific_note":"As a national park concession operator, fire safety documentation failures at any location can trigger NPS concession compliance review across your entire portfolio."}',
 'published', true),

-- 2: AB-2890 Food Handler Bill
('d1000000-0000-0000-0000-000000000002', 'manual', 'legislative', 'legislative_update', 'high', 'urgent',
 'AB-2890 Food Handler Certification Bill Passes Senate Committee 7-2',
 'AB-2890 requiring annual food handler recertification has 73% passage probability — compliance deadline likely July 2027.',
 'AB-2890 passed the Senate Health Committee 7-2 on February 18, 2026, moving to the Senate floor with strong bipartisan support. The bill would require all food handlers to complete annual recertification rather than the current 3-year cycle. Estimated compliance cost is $45-120 per employee per year.',
 'AB-2890 cleared the Senate Health Committee with a strong 7-2 bipartisan vote on February 18, 2026. The bill was authored by Assemblymember Rodriguez (D-Los Angeles) with co-sponsorship from Senator Williams (R-Fresno). The bill modifies HSC §113948 to require annual recertification for all food handlers in California.',
 'AB-2890 represents a significant compliance cost increase for multi-location operators. A 100-employee operation would face $4,500-$12,000 in additional annual training costs if passed as written. Recommended to begin budgeting for FY2027.',
 '["Add AB-2890 to your regulatory tracking watchlist","Estimate total food handler headcount across all locations","Calculate potential cost impact: headcount x $45-120 per person per year","Contact your California Restaurant Association representative to submit comments","Begin evaluating online recertification platforms that could reduce per-employee cost"]',
 '{food_safety}', '{}', 0.78,
 '{AB-2890,food handler,certification,legislation,California}',
 '{"low":4500,"high":12000,"currency":"USD","methodology":"Per-employee annual recertification cost x estimated headcount"}',
 '2026-02-18T14:00:00Z', 'California Legislature', 'strong',
 '{"relevance_score":0.78,"business_context":"AB-2890 annual food handler recertification would affect all 245 employees across your 7 locations.","affected_locations":[{"name":"UC Merced Dining Hall","impact":"Highest impact — seasonal student worker turnover increases recertification volume","risk_level":"high"},{"name":"CSU Stanislaus Food Court","impact":"High impact — similar student worker recertification burden","risk_level":"high"}],"financial_impact_adjusted":{"low":22050,"high":58800,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations at 35 avg employees each"},"personalized_actions":["Audit food handler certification expiration dates across all 7 locations immediately","Prioritize UC Merced and CSU Stanislaus — student worker turnover creates highest gap risk","Negotiate volume recertification pricing with an approved online training provider for 245+ employees"],"industry_specific_note":"NPS concession agreements may require compliance with new state regulations ahead of the general deadline."}',
 'published', true),

-- 3: Romaine Lettuce Recall
('d1000000-0000-0000-0000-000000000003', 'manual', 'fda_recall', 'recall_alert', 'critical', 'immediate',
 'Class I Recall: Romaine Lettuce E.coli O157:H7 — California Distribution',
 'URGENT: Class I recall for romaine lettuce with confirmed E.coli O157:H7 contamination affects California restaurant distributors.',
 'FDA issued a Class I recall on February 21, 2026 for romaine lettuce from Salinas Valley distributed by three major California food service distributors. E.coli O157:H7 has been confirmed in 12 illness cases across California. All lot codes from January 15 - February 15 2026 are affected.',
 'The FDA Class I recall (Recall #F-0847-2026) was initiated after CDC confirmed E.coli O157:H7 in 12 illness cases across California with whole genome sequencing linking all cases to romaine lettuce from a single Salinas Valley growing operation.',
 'Class I recall requires immediate inventory removal. Failure to act creates HACCP documentation gaps, potential liability, and health code violations if product remains in use. Document removal for inspection records.',
 '["IMMEDIATELY check all romaine lettuce inventory and remove affected lot codes","Contact your produce supplier to confirm if your supply chain is affected","Document removal in your HACCP log with date, quantity, and disposition","Notify kitchen staff to halt all romaine use until clearance confirmed","Take photos of disposed product for your records"]',
 '{food_safety}', '{fresno,merced,stanislaus,mariposa,sacramento}', 0.99,
 '{recall,romaine,ecoli,FDA,Class I,HACCP}',
 '{"low":500,"high":5000,"currency":"USD","methodology":"Inventory disposal, supplier credit claim, documentation time"}',
 '2026-02-21T10:00:00Z', 'FDA Food Safety and Inspection Service', 'strong',
 '{"relevance_score":0.97,"business_context":"This Class I recall affects all 3 of your primary suppliers. All 7 locations are potentially exposed.","affected_locations":[{"name":"Half Dome Village Food Court","impact":"Highest volume — 600 daily covers, romaine used in multiple menu items","risk_level":"high"},{"name":"UC Merced Dining Hall","impact":"1,200 daily covers — salad bar likely contains affected product","risk_level":"high"}],"financial_impact_adjusted":{"low":7000,"high":70000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations"},"personalized_actions":["IMMEDIATELY check romaine inventory at ALL 7 locations","Halt romaine use at Half Dome Village and university dining halls until supplier clearance confirmed","Document removal at each location in HACCP logs"],"industry_specific_note":"NPS concession operations face additional recall documentation requirements. File NPS Incident Report Form 10-343 within 24 hours."}',
 'published', true),

-- 4: Stanislaus Salmonella Investigation
('d1000000-0000-0000-0000-000000000004', 'manual', 'outbreak', 'outbreak_alert', 'critical', 'immediate',
 'Active Salmonella Investigation — Stanislaus County, 14 Cases Linked to Poultry',
 'CDPH is actively investigating 14 salmonella cases in Stanislaus County linked to poultry served at food service establishments.',
 'The California Department of Public Health is investigating a cluster of 14 Salmonella Typhimurium cases in Stanislaus County with illness onset dates between February 10-19, 2026. Epidemiological investigation suggests a food service source with poultry identified as the likely vehicle.',
 'CDPH initiated investigation CDPH-2026-0234 on February 17 after receiving reports of 14 Salmonella Typhimurium cases in Stanislaus County with onset dates clustered between February 10-19.',
 'Active outbreak investigations typically result in unannounced inspections of food service operations in the affected county. Ensure your poultry handling, cooking temperatures, and cross-contamination protocols are inspection-ready.',
 '["Review poultry cooking temperature logs for February 10-19 immediately","Confirm all staff are following proper poultry handling and cross-contamination prevention","Ensure 165°F minimum internal temperature is being verified and documented for all poultry","Review your HACCP plan for poultry CCP compliance","Be prepared for an unannounced health department visit in Stanislaus County this week"]',
 '{food_safety}', '{stanislaus}', 0.91,
 '{salmonella,outbreak,Stanislaus,poultry,CDPH,HACCP}',
 '{"low":0,"high":25000,"currency":"USD","methodology":"Potential inspection fines, temporary closure, legal exposure if linked"}',
 '2026-02-21T09:00:00Z', 'California Department of Public Health', 'strong',
 '{"relevance_score":0.91,"business_context":"The active salmonella investigation in Stanislaus County directly threatens your CSU Stanislaus Food Court, which has existing poultry temperature variance and cross-contamination vulnerabilities.","affected_locations":[{"name":"CSU Stanislaus Food Court","impact":"Direct exposure — active vulnerabilities for poultry temps and cross-contamination in outbreak county","risk_level":"high"}],"financial_impact_adjusted":{"low":0,"high":50000,"methodology":"Adjusted for national park concession (2.0x multiplier)"},"personalized_actions":["Review CSU Stanislaus poultry cooking temperature logs for February 10-19 immediately","Retrain CSU Stanislaus staff on poultry handling and 165°F verification this week","Prepare CSU Stanislaus for unannounced inspection"],"industry_specific_note":"A salmonella linkage to any Aramark university dining operation would trigger institutional review across your entire education food service portfolio."}',
 'published', true),

-- 5: NFPA 96 2025 Edition
('d1000000-0000-0000-0000-000000000005', 'manual', 'regulatory', 'regulatory_change', 'high', 'urgent',
 'NFPA 96 2025 Edition Enforcement Begins July 1, 2026 in California',
 'California fire marshals will begin enforcing NFPA 96 2025 edition requirements on July 1, 2026 — 4 key changes affect most commercial kitchens.',
 'Cal Fire has confirmed that the NFPA 96 2025 edition will become the enforced standard effective July 1, 2026, replacing the 2021 edition. Four significant changes affect commercial kitchens: updated hood listing requirements, revised grease duct clearance minimums, new inspection documentation requirements for suppression systems, and changed monthly inspection frequencies for solid-fuel cooking operations.',
 'Cal Fire Office of the State Fire Marshal issued Bulletin 2026-003 on February 12 confirming adoption of NFPA 96 Standard for Ventilation Control and Fire Protection of Commercial Cooking Operations, 2025 Edition.',
 'NFPA 96 2025 transition creates a 4-month compliance window. Operations with solid-fuel cooking equipment face the most significant changes. Recommend immediate gap assessment against 2025 edition requirements.',
 '["Schedule a gap assessment against NFPA 96 2025 edition before April 1","Review hood listing documentation for compliance with updated requirements","Confirm grease duct clearances meet 2025 edition minimums","Update your fire safety checklist to reflect 2025 inspection documentation requirements","Brief your hood cleaning vendor on 2025 edition changes before their next service visit"]',
 '{fire_safety}', '{}', 0.88,
 '{NFPA 96,2025,fire code,Cal Fire,hood,suppression}',
 '{"low":1500,"high":15000,"currency":"USD","methodology":"Gap assessment, documentation updates, potential equipment modifications"}',
 '2026-02-15T10:00:00Z', 'Cal Fire Office of the State Fire Marshal', 'strong',
 '{"relevance_score":0.88,"business_context":"NFPA 96 2025 edition enforcement affects all 7 locations, but your 4 Yosemite NPS concession locations face dual documentation requirements.","affected_locations":[{"name":"Half Dome Village Food Court","impact":"Hood cleaning approaching threshold plus new documentation requirements","risk_level":"high"},{"name":"Yosemite Valley Lodge Dining","impact":"Dual jurisdiction — NPS + county fire marshal both require compliance","risk_level":"high"}],"financial_impact_adjusted":{"low":21000,"high":210000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations"},"personalized_actions":["Schedule NFPA 96 2025 gap assessments for all 7 locations before April 1","Coordinate dual-jurisdiction documentation with both NPS and Mariposa County fire marshal","The Ahwahnee historic designation may require variance requests for duct clearance changes"],"industry_specific_note":"NPS Concession Advisory CA-2026-008 already requires updated fire safety documentation."}',
 'published', true),

-- 6: Competitor Closures
('d1000000-0000-0000-0000-000000000006', 'manual', 'competitor', 'competitor_activity', 'medium', 'standard',
 'Two Competitor Restaurant Closures Within 2 Miles of Your Downtown Location',
 'Health department closed 2 restaurants near your Downtown Fresno location — their customers are now available to you.',
 'Fresno County Environmental Health issued immediate closure orders to two food service operations within 1.8 miles of your Downtown Fresno location on February 19, 2026. One closure was due to repeat temperature violations, the other for pest infestation.',
 'Fresno County Environmental Health enforcement records show two immediate closure orders issued on February 19, 2026 within the Downtown Fresno dining district.',
 'Competitor closures near your Downtown location represent a short-term customer capture opportunity. Estimated 200-400 displaced diners.',
 '["Ensure your compliance QR passport is prominently displayed at Downtown location","Consider a short-term promotional offer to attract new customers this week","Review your own temperature logs to confirm no similar vulnerabilities","Update your Google Business profile to highlight your clean inspection record","Brief front-of-house staff on your compliance story for customer questions"]',
 '{food_safety}', '{fresno}', 0.79,
 '{competitor,closure,Fresno,Downtown,opportunity}',
 '{"low":0,"high":0,"currency":"USD","methodology":"No direct cost — opportunity signal"}',
 '2026-02-19T16:00:00Z', 'Fresno County Environmental Health', 'moderate',
 '{"relevance_score":0.65,"business_context":"Two competitor closures near your Fresno Convention Center create a customer capture opportunity.","affected_locations":[{"name":"Fresno Convention Center Catering","impact":"Opportunity — competitor closures within 2 miles create catering demand","risk_level":"low"}],"financial_impact_adjusted":{"low":0,"high":0,"methodology":"No direct cost — opportunity signal"},"personalized_actions":["Highlight Aramark''s compliance record in upcoming Fresno Convention Center event proposals","Ensure your EvidLY compliance QR passport is displayed at the Fresno location"],"industry_specific_note":"As a national park concession operator, your brand reputation for food safety is a competitive advantage."}',
 'published', true),

-- 7: Heat Advisory
('d1000000-0000-0000-0000-000000000007', 'manual', 'weather', 'weather_risk', 'high', 'urgent',
 'Extreme Heat Advisory: Central Valley June 15-22 — Temperature Log Risk Window',
 'NWS forecasts 108-114°F in Central Valley June 15-22 — historical data shows 340% spike in walk-in cooler violations during this heat window.',
 'The National Weather Service has issued an Extreme Heat Advisory for Fresno, Merced, Stanislaus, and Tulare counties June 15-22, 2026, with temperatures forecast at 108-114°F. EvidLY historical analysis shows a 340% increase in walk-in cooler temperature exceedances.',
 'The National Weather Service Hanford office has issued an Extreme Heat Advisory for the Central Valley corridor for the period June 15-22, 2026.',
 'The upcoming heat event creates elevated risk of temperature violations, refrigeration failures, and associated food safety incidents.',
 '["Schedule preventive maintenance on all refrigeration units before June 10","Increase temperature logging frequency to every 2 hours during the heat event","Pre-position backup temperature monitoring (coolers, ice) at each location","Ensure staff know the emergency protocol if a unit fails during service","Consider pre-booking emergency refrigeration service contracts before demand spikes"]',
 '{food_safety}', '{fresno,merced,stanislaus,tulare}', 0.87,
 '{heat wave,temperature,walk-in cooler,Central Valley,NWS,refrigeration}',
 '{"low":800,"high":12000,"currency":"USD","methodology":"Emergency maintenance, inventory loss, increased monitoring labor costs"}',
 '2026-02-20T12:00:00Z', 'National Weather Service — Hanford CA', 'strong',
 '{"relevance_score":0.92,"business_context":"The June 15-22 heat advisory directly overlaps your peak season when Yosemite visitor counts and food service volumes are at maximum.","affected_locations":[{"name":"Half Dome Village Food Court","impact":"CRITICAL — cooler already trending warm, 600 daily covers during peak season heat","risk_level":"high"},{"name":"Yosemite Valley Lodge Dining","impact":"Peak season volume at 450 covers/day during heat event","risk_level":"high"}],"financial_impact_adjusted":{"low":11200,"high":168000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations"},"personalized_actions":["PRIORITY: Schedule emergency preventive maintenance on Half Dome Village cooler before June 10","Pre-position backup refrigeration at all Yosemite locations","Increase temperature monitoring to every 2 hours at all locations during June 15-22"],"industry_specific_note":"NPS locations in Yosemite have limited backup refrigeration options due to park infrastructure constraints."}',
 'published', true),

-- 8: CalOSHA Citations
('d1000000-0000-0000-0000-000000000008', 'manual', 'osha', 'enforcement_action', 'medium', 'standard',
 'CalOSHA Food Service Citations Up 28% YTD — Slip/Fall and Heat Illness Leading',
 'CalOSHA has increased food service enforcement 28% year-to-date with slip/fall hazards and heat illness prevention as top targets.',
 'CalOSHA enforcement data for January-February 2026 shows a 28% increase in citations issued to food service operations versus the same period in 2025.',
 'CalOSHA Division of Occupational Safety and Health enforcement data for January 1 through February 14, 2026 shows 28% more citations issued to NAICS code 722.',
 'Increased CalOSHA enforcement activity creates additional compliance obligations beyond health department requirements.',
 '["Verify all kitchen locations have written Heat Illness Prevention Plans","Audit non-slip matting in all wet kitchen areas","Ensure break room access to cool water and shade/AC during summer months","Add CalOSHA heat illness prevention to your compliance checklist","Check that all required safety postings are current and visible"]',
 '{food_safety}', '{}', 0.84,
 '{CalOSHA,heat illness,slip fall,food service,enforcement}',
 '{"low":500,"high":8000,"currency":"USD","methodology":"Citation fines ($2,500-$7,000 per serious violation) plus remediation costs"}',
 '2026-02-18T09:00:00Z', 'CalOSHA', 'moderate',
 '{"relevance_score":0.75,"business_context":"CalOSHA''s 28% enforcement increase affects all 7 Aramark locations.","affected_locations":[{"name":"Fresno Convention Center Catering","impact":"Direct vulnerability — heat illness prevention plan missing","risk_level":"high"}],"financial_impact_adjusted":{"low":7000,"high":112000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations"},"personalized_actions":["IMMEDIATE: Develop written Heat Illness Prevention Plan for Fresno Convention Center","Audit non-slip matting in all kitchen areas across 7 locations","Ensure all Yosemite locations have outdoor heat illness provisions for seasonal staff"],"industry_specific_note":"National park concession employers face additional NPS occupational health requirements beyond CalOSHA."}',
 'published', true),

-- 9: Merced Inspector Rotation
('d1000000-0000-0000-0000-000000000009', 'manual', 'health_dept', 'inspector_pattern', 'medium', 'standard',
 'Merced County Inspector Rotation — New Lead Inspector Focuses on Temperature Documentation',
 'Merced County assigned a new lead inspector who cites temperature log documentation gaps at 3x the previous rate.',
 'Merced County Department of Public Health rotated its lead food inspector for the Merced-Atwater corridor effective February 1, 2026. The new inspector has issued 3x more citations for temperature log documentation gaps.',
 'Merced County DPH reassigned Inspector Chen (Badge #412) to the Merced-Atwater corridor on February 1, replacing Inspector Davis who retired after 18 years.',
 'New Merced County inspector focuses heavily on temperature documentation completeness. Your Airport Cafe location should be prepared for a documentation-focused inspection within the next 30 days.',
 '["Audit temperature log completeness at Airport Cafe for the last 30 days","Ensure all temp logs include time, recorder name, and corrective action (if out of range)","Train staff on proper documentation when a reading is out of range","Consider upgrading to automated temperature monitoring at Airport Cafe"]',
 '{food_safety}', '{merced}', 0.76,
 '{inspector,Merced,temperature logs,documentation,rotation}',
 '{"low":250,"high":3000,"currency":"USD","methodology":"Citation risk plus staff training time"}',
 '2026-02-17T11:00:00Z', 'Merced County Department of Public Health', 'moderate',
 '{"relevance_score":0.85,"business_context":"The new Merced County inspector''s focus on temperature documentation directly threatens your UC Merced Dining Hall.","affected_locations":[{"name":"UC Merced Dining Hall","impact":"Direct exposure — known temp log documentation gaps with new documentation-focused inspector","risk_level":"high"}],"financial_impact_adjusted":{"low":500,"high":6000,"methodology":"Adjusted for national park concession (2.0x multiplier)"},"personalized_actions":["Audit UC Merced temperature log completeness for the last 30 days","Train UC Merced staff specifically on proper documentation when readings are out of range","Consider upgrading to automated temperature monitoring at UC Merced"],"industry_specific_note":"University dining operations with high student worker turnover are particularly vulnerable to documentation inconsistencies."}',
 'published', true),

-- 10: FDA Glove Use Guidance
('d1000000-0000-0000-0000-000000000010', 'manual', 'regulatory', 'regulatory_change', 'medium', 'standard',
 'FDA Updates Glove Use Guidance for Ready-to-Eat Foods — Effective March 2026',
 'FDA revised Food Code Section 3-301.11 guidance — new best practices for glove use with ready-to-eat foods effective March 1.',
 'The FDA issued updated guidance on February 10, 2026 clarifying acceptable glove use practices under Food Code Section 3-301.11 for bare hand contact with ready-to-eat foods.',
 'FDA Guidance Document GD-2026-014 updates the interpretation of Food Code §3-301.11 regarding bare hand contact and glove use with ready-to-eat (RTE) foods.',
 'FDA glove guidance update is a low-cost compliance item that demonstrates proactive food safety culture.',
 '["Review current glove use SOPs against new FDA guidance","Order colored (blue or black) gloves for all food prep stations","Update allergen cross-contact prevention procedures to include glove change requirements","Brief kitchen staff on updated glove practices during next team meeting"]',
 '{food_safety}', '{}', 0.85,
 '{FDA,gloves,ready-to-eat,Food Code,allergen,guidance}',
 '{"low":100,"high":500,"currency":"USD","methodology":"Glove procurement change, minimal training time"}',
 '2026-02-10T15:00:00Z', 'FDA Center for Food Safety and Applied Nutrition', 'moderate',
 '{"relevance_score":0.62,"business_context":"FDA glove guidance update affects all 7 Aramark locations.","affected_locations":[{"name":"The Ahwahnee Dining Room","impact":"Fine dining with extensive allergen menu accommodations","risk_level":"medium"},{"name":"UC Merced Dining Hall","impact":"University dining with 8 major allergen stations","risk_level":"medium"}],"financial_impact_adjusted":{"low":1400,"high":7000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations"},"personalized_actions":["Order colored (blue or black) gloves for all 7 locations","Update allergen cross-contact SOPs for The Ahwahnee and university dining halls first","Brief all kitchen staff on updated glove practices during next shift meetings"],"industry_specific_note":"NPS concession food service operations are expected to adopt FDA guidance promptly."}',
 'published', true),

-- 11: Benchmark Shift
('d1000000-0000-0000-0000-000000000011', 'manual', 'industry', 'benchmark_shift', 'medium', 'informational',
 'California Food Safety Benchmark: Average Score Drops 2.3 Points Industry-Wide in Q4 2025',
 'Industry average food safety scores fell 2.3 points in Q4 2025 — your Downtown location now ranks in the 89th percentile.',
 'EvidLY benchmark data shows a 2.3-point decline in average food safety scores across 2,400 monitored locations in Q4 2025. The decline is attributed to holiday season staffing shortages and increased operational tempo.',
 'EvidLY benchmark analysis across 2,400 California food service locations shows the statewide average food safety score declined from 79.2 to 76.9 (-2.3 points) in Q4 2025.',
 'Industry-wide score decline improves your relative competitive position without any operational changes. Your Downtown location is now top-decile in California.',
 '["Update your QR passport to highlight 89th percentile ranking","Consider a Food Safety Excellence marketing campaign for Q1 2026","Use benchmark data in insurance renewal conversations to negotiate better rates","Share the benchmark improvement with your team as a motivation and recognition tool"]',
 '{food_safety}', '{}', 0.81,
 '{benchmark,industry average,percentile,California,food safety}',
 '{"low":0,"high":0,"currency":"USD","methodology":"No direct cost — informational signal"}',
 '2026-02-12T10:00:00Z', 'EvidLY Benchmark Engine', 'moderate',
 '{"relevance_score":0.58,"business_context":"The industry-wide benchmark decline improves Aramark''s relative position across all 7 locations.","affected_locations":[{"name":"The Ahwahnee Dining Room","impact":"Score 96 — now top 5% in California","risk_level":"low"}],"financial_impact_adjusted":{"low":0,"high":0,"methodology":"No direct cost — competitive positioning opportunity"},"personalized_actions":["Update Aramark''s NPS concession renewal documentation to highlight top-decile food safety ranking","Use benchmark data in upcoming university dining contract renewals"],"industry_specific_note":"NPS concession renewals heavily weight compliance performance."}',
 'published', true),

-- 12: NPS Concession Advisory
('d1000000-0000-0000-0000-000000000012', 'manual', 'nps', 'concession_advisory', 'high', 'urgent',
 'NPS Concession Compliance Advisory — Yosemite Fire Safety Documentation Requirements Updated',
 'National Park Service updated concession fire safety documentation requirements for Yosemite — dual-jurisdiction operators must comply by April 1.',
 'The National Park Service issued Concession Advisory CA-2026-008 on February 14, 2026 updating fire safety documentation requirements for all commercial food service concessions in Yosemite National Park.',
 'NPS Concession Advisory CA-2026-008 modifies the documentation requirements under the Concession Management Improvement Act (P.L. 105-391) for Yosemite National Park food service operations.',
 'NPS documentation update affects dual-jurisdiction operators at Yosemite. Compliance requires photographic evidence and digital submission — EvidLY already captures both.',
 '["Review NPS Concession Advisory CA-2026-008 for your Yosemite locations","Ensure monthly fire suppression inspections include timestamped photos","Set up digital submission workflow for NPS Concession Management System","Verify your documentation meets both NPS and Mariposa County requirements","Calendar the April 1, 2026 compliance deadline"]',
 '{fire_safety}', '{mariposa}', 0.92,
 '{NPS,Yosemite,concession,fire safety,dual jurisdiction,documentation}',
 '{"low":500,"high":3000,"currency":"USD","methodology":"Documentation system setup, training, photo equipment"}',
 '2026-02-14T08:00:00Z', 'National Park Service — Yosemite', 'strong',
 '{"relevance_score":0.98,"business_context":"This NPS advisory directly targets your Yosemite concession operations.","affected_locations":[{"name":"Yosemite Valley Lodge Dining","impact":"NPS concession — must comply with CA-2026-008 by April 1","risk_level":"high"},{"name":"The Ahwahnee Dining Room","impact":"NPS concession — dual documentation for NPS + county fire marshal","risk_level":"high"},{"name":"Half Dome Village Food Court","impact":"NPS concession — existing documentation gap compounds new requirements","risk_level":"high"}],"financial_impact_adjusted":{"low":4000,"high":24000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 4 Mariposa County locations"},"personalized_actions":["Review NPS Concession Advisory CA-2026-008 with your Yosemite facilities team this week","Set up photographic evidence workflow for monthly fire suppression inspections at all 4 NPS locations","Register for NPS Concession Management System digital submission — April 1 deadline is non-negotiable"],"industry_specific_note":"This advisory is specifically written for your operation type. Non-compliance risks concession agreement penalties."}',
 'published', true),

-- 13: Poultry Supply Disruption
('d1000000-0000-0000-0000-000000000013', 'manual', 'supply_chain', 'supply_disruption', 'medium', 'standard',
 'Central Valley Poultry Supply Disruption — Avian Flu Detected in Two Farms',
 'USDA confirmed avian influenza at two Central Valley poultry farms — expect 15-20% price increase and potential supply gaps in March.',
 'USDA APHIS confirmed highly pathogenic avian influenza (HPAI) at two commercial poultry farms in Fresno and Merced counties on February 16, 2026. Combined, the farms house approximately 800,000 birds.',
 'USDA APHIS confirmed HPAI H5N1 detections at Sunrise Poultry (Fresno County, 500,000 birds) and Valley Fresh Farms (Merced County, 300,000 birds) on February 16, 2026.',
 'Poultry supply disruption will increase food costs 15-20% for March-April. Recommend locking in current pricing with suppliers where possible.',
 '["Contact your poultry supplier to lock in current pricing for the next 30 days","Review menu items dependent on poultry and prepare alternative protein options","Increase frozen poultry inventory buffer if storage capacity allows","Monitor USDA APHIS for additional farm detections in the region"]',
 '{}', '{fresno,merced}', 0.88,
 '{avian flu,HPAI,poultry,supply chain,USDA,Central Valley}',
 '{"low":2000,"high":8000,"currency":"USD","methodology":"Estimated food cost increase across locations for 4-6 week disruption period"}',
 '2026-02-16T14:00:00Z', 'USDA APHIS', 'moderate',
 '{"relevance_score":0.84,"business_context":"HPAI detections at farms supplying Sysco NorCal and Performance Foodservice Fresno directly affect your supply chain.","affected_locations":[{"name":"UC Merced Dining Hall","impact":"1,200 daily covers — highest poultry consumption across portfolio","risk_level":"high"},{"name":"Half Dome Village Food Court","impact":"Peak season quick service relies heavily on poultry menu items","risk_level":"high"}],"financial_impact_adjusted":{"low":28000,"high":112000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations"},"personalized_actions":["Contact Sysco NorCal and Performance Foodservice Fresno to lock in poultry pricing for the next 60 days","Review university dining and NPS concession menus for alternative protein options","Increase frozen poultry inventory at Yosemite locations before peak season begins in May"],"industry_specific_note":"NPS concession menu changes require prior approval under your concession agreement."}',
 'published', true),

-- 14: CDPH Walk-in Cooler Advisory
('d1000000-0000-0000-0000-000000000014', 'manual', 'cdph', 'regulatory_advisory', 'medium', 'standard',
 'CDPH Walk-in Cooler Advisory: 41°F Threshold Enforcement Clarification',
 'CDPH clarified that 41°F walk-in cooler threshold is measured at warmest point — not at the thermostat.',
 'CDPH issued Advisory CDPH-EH-2026-012 on February 13, 2026 clarifying that the 41°F cold holding temperature threshold under CalCode §113996 is measured at the warmest point of the storage unit.',
 'CDPH Environmental Health Branch advisory CDPH-EH-2026-012 provides enforcement guidance to local health departments on cold holding temperature measurements.',
 'Walk-in cooler temperature enforcement at warmest point will catch operations that only monitor at the thermostat. Recommend adding a second monitoring point.',
 '["Identify the warmest point in each walk-in cooler (typically top shelf near door)","Place a secondary thermometer or sensor at the warmest point","Adjust thermostat setpoints to ensure warmest point stays below 41°F","Update temperature logging procedures to record warmest-point readings"]',
 '{food_safety}', '{}', 0.86,
 '{CDPH,walk-in cooler,41F,temperature,CalCode,enforcement}',
 '{"low":50,"high":500,"currency":"USD","methodology":"Secondary thermometer cost plus minor thermostat adjustment"}',
 '2026-02-13T10:00:00Z', 'CDPH Environmental Health Branch', 'moderate',
 '{"relevance_score":0.86,"business_context":"CDPH warmest-point measurement clarification directly threatens your Half Dome Village Food Court, which already has a cooler trending warm.","affected_locations":[{"name":"Half Dome Village Food Court","impact":"CRITICAL — cooler already trending warm, warmest-point standard increases citation risk","risk_level":"high"},{"name":"UC Merced Dining Hall","impact":"High-volume dining — verify warmest-point compliance in all walk-in coolers","risk_level":"medium"}],"financial_impact_adjusted":{"low":700,"high":7000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations"},"personalized_actions":["PRIORITY: Place secondary thermometer at warmest point in Half Dome Village cooler","Survey all walk-in coolers across 7 locations and identify warmest points","Adjust cooler setpoints at Yosemite locations to account for summer ambient temperature increases"],"industry_specific_note":"Yosemite locations face unique ambient temperature challenges that affect cooler performance."}',
 'published', true),

-- 15: Minimum Wage Increase
('d1000000-0000-0000-0000-000000000015', 'manual', 'legislative', 'legislative_update', 'medium', 'informational',
 'California Minimum Wage Increase to $17.50/hr Effective January 1, 2027 — Impact on Staffing and Compliance',
 'California minimum wage increases to $17.50/hr in 2027 — expected to accelerate kitchen staff turnover by 12-18% in the transition period.',
 'Governor Newsom signed SB-1456 on January 15, 2026 increasing the California minimum wage to $17.50/hr effective January 1, 2027, up from $16.50/hr. EvidLY analysis shows a 12-18% spike in food service staff turnover in the 3 months following implementation.',
 'SB-1456 was signed into law on January 15, 2026, establishing the California minimum wage at $17.50/hour effective January 1, 2027.',
 'Minimum wage increase will compress margins and drive turnover. The compliance impact of turnover is often larger than the direct wage cost.',
 '["Model the wage increase impact on your labor costs across all locations","Consider proactive wage adjustments in Q3-Q4 2026 to reduce turnover spike","Ensure all food handler certifications are current before the transition period","Budget for increased training costs in Q4 2026 and Q1 2027"]',
 '{food_safety}', '{}', 0.90,
 '{minimum wage,SB-1456,staffing,turnover,compliance impact,California}',
 '{"low":15000,"high":45000,"currency":"USD","methodology":"Annualized labor cost increase across locations plus turnover-related compliance costs"}',
 '2026-02-10T08:00:00Z', 'California Legislature', 'strong',
 '{"relevance_score":0.72,"business_context":"The minimum wage increase to $17.50/hr affects approximately 245 employees across your 7 locations.","affected_locations":[{"name":"UC Merced Dining Hall","impact":"Highest turnover risk — student workers most sensitive to wage changes","risk_level":"high"},{"name":"CSU Stanislaus Food Court","impact":"Student worker retention risk during transition period","risk_level":"high"}],"financial_impact_adjusted":{"low":210000,"high":630000,"methodology":"Adjusted for national park concession (2.0x multiplier) across 7 locations at 35 employees average"},"personalized_actions":["Model wage increase impact across all 7 locations — prioritize university dining","Ensure all food handler certifications are current at UC Merced and CSU Stanislaus before Q4 turnover spike","Budget for increased Yosemite seasonal hiring costs in 2027 peak season planning"],"industry_specific_note":"NPS concession labor costs are factored into franchise fee calculations. Begin the NPS concession fee adjustment request process early."}',
 'published', true);


-- ═══════════════════════════════════════════════════════════
-- SEED: Demo Executive Snapshot
-- ═══════════════════════════════════════════════════════════

INSERT INTO executive_snapshots (id, organization_id, is_demo_eligible, generated_at, content, status) VALUES
('d2000000-0000-0000-0000-000000000001', NULL, true, now(),
 '{
  "generated_at": "2026-02-22T12:00:00Z",
  "one_liner": "Pacific Coast Dining is operationally compliant with 2 critical external alerts requiring immediate action and 1 regulatory change requiring Q2 preparation.",
  "overall_status": "warning",
  "key_metrics": {
    "food_safety_score": 84,
    "food_safety_trend": 2.1,
    "fire_safety_score": 77,
    "fire_safety_trend": -1.3,
    "open_risk_items": 7,
    "intelligence_alerts_7d": 9,
    "regulatory_pipeline": 4,
    "financial_exposure": {"low": 125000, "high": 380000}
  },
  "executive_summary": "Pacific Coast Dining''s compliance posture is stable with improving food safety metrics (+2.1 points, 30-day trend) offset by a fire safety decline (-1.3 points) driven by overdue equipment inspections at University Dining. Two critical external intelligence alerts require immediate action: an FDA Class I romaine lettuce recall affecting your supply chain, and an active salmonella investigation in Stanislaus County that will likely trigger unannounced inspections at your University Dining location this week.\n\nYour competitive position is strengthening — two competitor closures near Downtown and an industry-wide benchmark decline have moved your Downtown location into the 89th percentile. However, regulatory headwinds are building: NFPA 96 2025 edition enforcement begins July 1 (4-month preparation window), and AB-2890 food handler recertification is advancing with 73% passage probability. Financial exposure across all locations ranges from $125,000 to $380,000 if identified risks materialize without mitigation.",
  "risk_heatmap": [
    {"dimension": "Food Safety", "score": 84, "industry_avg": 77},
    {"dimension": "Fire Safety", "score": 77, "industry_avg": 74},
    {"dimension": "Documentation", "score": 82, "industry_avg": 68},
    {"dimension": "Regulatory", "score": 71, "industry_avg": 65},
    {"dimension": "Market", "score": 88, "industry_avg": 72},
    {"dimension": "Operational", "score": 79, "industry_avg": 73}
  ],
  "threats": [
    {"title": "FDA Class I Romaine Recall", "detail": "Active E.coli O157:H7 recall affecting California distributors — requires immediate inventory check and HACCP documentation."},
    {"title": "Stanislaus County Salmonella Investigation", "detail": "14 cases linked to poultry — expect unannounced inspections at University Dining within days."},
    {"title": "Fresno Hood Cleaning Enforcement Surge", "detail": "47% citation increase — your Downtown location is in the enforcement zone."}
  ],
  "opportunities": [
    {"title": "Competitor Closures Near Downtown", "detail": "Two closures within 2 miles create short-term customer capture opportunity (200-400 displaced diners)."},
    {"title": "Benchmark Position Improvement", "detail": "Industry-wide score decline moved Downtown to 89th percentile — leverage in marketing and insurance negotiations."},
    {"title": "Insurance Premium Negotiation Window", "detail": "Strong compliance documentation supports a 10-15% premium reduction request at next renewal."}
  ],
  "correlation_analysis": [
    {"external_event": "Fresno hood cleaning enforcement surge (+47%)", "internal_impact": "Downtown hood cleaning logs show last service 67 days ago (within compliance but approaching threshold)", "strength": "strong", "action": "Schedule hood cleaning at Downtown within 10 days to stay ahead of enforcement window"},
    {"external_event": "Stanislaus County salmonella investigation (14 cases)", "internal_impact": "University Dining poultry temp logs show 2 readings at 162°F (below 165°F minimum) last week", "strength": "strong", "action": "Immediately retrain University Dining staff on poultry cooking temperature verification"},
    {"external_event": "Industry benchmark decline (-2.3 points)", "internal_impact": "Your food safety trend is +2.1 points — widening competitive gap", "strength": "moderate", "action": "Leverage improved percentile ranking in QR passport and marketing materials"},
    {"external_event": "Central Valley heat advisory (June 15-22)", "internal_impact": "Airport Cafe walk-in cooler already trending warm — heat event will exacerbate", "strength": "moderate", "action": "Schedule preventive maintenance on Airport Cafe cooler before May 30"}
  ],
  "competitor_landscape": {
    "closures": 2,
    "failed_inspections": 3,
    "position": "competitive",
    "summary": "Two competitor closures within 2 miles of Downtown. Three failed inspections in Merced County in the last 30 days."
  },
  "regulatory_forecast": [
    {"title": "NFPA 96 2025 Edition Enforcement", "probability": 0.95, "compliance_deadline": "2026-07-01", "estimated_cost_per_location": {"low": 500, "high": 5000}, "summary": "Confirmed by Cal Fire. Gap assessment recommended before April 1."},
    {"title": "AB-2890 Annual Food Handler Recertification", "probability": 0.73, "compliance_deadline": "2027-07-01", "estimated_cost_per_location": {"low": 1500, "high": 4000}, "summary": "Passed Senate committee 7-2."},
    {"title": "FDA Glove Use Guidance Update", "probability": 0.60, "compliance_deadline": "2026-03-01", "estimated_cost_per_location": {"low": 50, "high": 200}, "summary": "FDA guidance effective March 1."}
  ],
  "financial_impact": {
    "risk_exposure": {"low": 125000, "high": 380000},
    "compliance_savings": 47000,
    "roi_ratio": "3.8x",
    "top_cost_drivers": [
      {"label": "Potential closure orders (fire safety)", "amount": 85000},
      {"label": "Recall-related costs (food safety)", "amount": 45000},
      {"label": "Regulatory fines (documentation gaps)", "amount": 32000},
      {"label": "Staffing turnover (compliance disruption)", "amount": 28000},
      {"label": "Emergency maintenance (heat event)", "amount": 18000}
    ]
  },
  "inspector_intelligence": [
    {"id": "ip-1", "county": "Fresno", "strictness_percentile": 78, "focus_areas": ["hood cleaning", "temperature logs", "documentation"], "trend": "increasing", "recommendation": "Ensure hood cleaning documentation includes grease weight measurements.", "recent_citation_rate": 2.3},
    {"id": "ip-2", "county": "Merced", "strictness_percentile": 62, "focus_areas": ["temperature logs", "corrective actions", "signage"], "trend": "increasing", "recommendation": "New inspector (Chen, #412) is 3x more likely to cite temperature log documentation gaps.", "recent_citation_rate": 1.8},
    {"id": "ip-3", "county": "Stanislaus", "strictness_percentile": 71, "focus_areas": ["documentation", "food handling", "cross-contamination"], "trend": "stable", "recommendation": "Active salmonella investigation will increase inspection frequency.", "recent_citation_rate": 2.1}
  ],
  "weather_risks": [
    {"advisory": "Extreme Heat Advisory", "counties": ["fresno", "merced", "stanislaus", "tulare"], "risk_window": "June 15-22, 2026", "impact": "340% increase in walk-in cooler violations historically during comparable heat events."}
  ],
  "strategic_recommendations": [
    {"priority": 1, "recommendation": "Respond to FDA Class I romaine lettuce recall immediately", "rationale": "Active recall with confirmed E.coli cases.", "estimated_impact": "Eliminates $5,000-$25,000 liability risk", "timeframe": "Today", "immediate": true},
    {"priority": 2, "recommendation": "Prepare University Dining for unannounced Stanislaus County inspection", "rationale": "Active salmonella investigation in the county.", "estimated_impact": "Prevents potential citation ($2,500-$7,000) and closure risk", "timeframe": "This week", "immediate": true},
    {"priority": 3, "recommendation": "Schedule hood cleaning at Downtown Kitchen within 10 days", "rationale": "Fresno County enforcement surge (+47% citations).", "estimated_impact": "Prevents $8,000-$45,000 closure costs", "timeframe": "10 days", "immediate": false},
    {"priority": 4, "recommendation": "Complete NFPA 96 2025 gap assessment for all locations", "rationale": "July 1 enforcement deadline.", "estimated_impact": "Ensures compliance, avoids $1,500-$15,000 remediation costs", "timeframe": "By April 1", "immediate": false},
    {"priority": 5, "recommendation": "Schedule preventive maintenance on Airport Cafe refrigeration", "rationale": "Walk-in cooler trending warm and CDPH clarified warmest-point measurement standard.", "estimated_impact": "Prevents $3,200 average emergency maintenance cost", "timeframe": "Before May 30", "immediate": false}
  ],
  "full_narrative": "EVIDLY INTELLIGENCE EXECUTIVE BRIEF\nPacific Coast Dining — February 22, 2026\n\nOVERVIEW\nPacific Coast Dining operates three food service locations in the Central Valley. Overall compliance posture is stable with food safety trending positively (+2.1 points) and fire safety declining slightly (-1.3 points).\n\nCRITICAL ALERTS\nTwo critical alerts require immediate executive attention.\n\nSTRATEGIC RECOMMENDATIONS\n1. [IMMEDIATE] Respond to romaine lettuce recall\n2. [IMMEDIATE] Prepare University Dining for Stanislaus County inspection\n3. [10 DAYS] Schedule hood cleaning at Downtown\n4. [BY APRIL 1] Complete NFPA 96 2025 gap assessment\n5. [BY MAY 30] Schedule preventive maintenance on Airport Cafe refrigeration",
  "source_count": 20
}',
 'published');
