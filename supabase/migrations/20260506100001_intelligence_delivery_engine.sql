-- ============================================================
-- INTELLIGENCE DELIVERY ENGINE
-- Adds risk dimension tagging, client intelligence feed,
-- and jurisdiction intelligence updates
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Risk dimension columns on intelligence_signals
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN risk_revenue     TEXT DEFAULT 'none' CHECK (risk_revenue     IN ('critical','high','moderate','low','none')),
    ADD COLUMN risk_liability   TEXT DEFAULT 'none' CHECK (risk_liability   IN ('critical','high','moderate','low','none')),
    ADD COLUMN risk_cost        TEXT DEFAULT 'none' CHECK (risk_cost        IN ('critical','high','moderate','low','none')),
    ADD COLUMN risk_operational  TEXT DEFAULT 'none' CHECK (risk_operational IN ('critical','high','moderate','low','none'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Risk dimension columns on regulatory_updates
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE regulatory_updates
    ADD COLUMN risk_revenue     TEXT DEFAULT 'none' CHECK (risk_revenue     IN ('critical','high','moderate','low','none')),
    ADD COLUMN risk_liability   TEXT DEFAULT 'none' CHECK (risk_liability   IN ('critical','high','moderate','low','none')),
    ADD COLUMN risk_cost        TEXT DEFAULT 'none' CHECK (risk_cost        IN ('critical','high','moderate','low','none')),
    ADD COLUMN risk_operational  TEXT DEFAULT 'none' CHECK (risk_operational IN ('critical','high','moderate','low','none'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. client_intelligence_feed — per-org personalized feed
--    Correlates advisories/signals to specific organizations
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_intelligence_feed (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL,
  advisory_id       UUID REFERENCES client_advisories(id) ON DELETE CASCADE,
  signal_id         UUID,
  title             TEXT NOT NULL,
  summary           TEXT NOT NULL,
  dimension         TEXT NOT NULL DEFAULT 'operational'
    CHECK (dimension IN ('revenue','liability','cost','operational')),
  risk_level        TEXT NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('critical','high','medium','low','informational')),
  feed_type         TEXT NOT NULL DEFAULT 'advisory'
    CHECK (feed_type IN ('advisory','regulatory','jurisdiction','recall','alert')),
  recommended_actions JSONB DEFAULT '[]',
  affected_locations  UUID[] DEFAULT '{}',
  is_read           BOOLEAN DEFAULT false,
  is_actioned       BOOLEAN DEFAULT false,
  is_dismissed      BOOLEAN DEFAULT false,
  actioned_by       TEXT,
  actioned_at       TIMESTAMPTZ,
  dismissed_by      TEXT,
  dismissed_at      TIMESTAMPTZ,
  delivered_via     TEXT[] DEFAULT '{}',   -- ['email','in_app','sms']
  delivered_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cif_org       ON client_intelligence_feed(organization_id);
CREATE INDEX IF NOT EXISTS idx_cif_dimension  ON client_intelligence_feed(dimension);
CREATE INDEX IF NOT EXISTS idx_cif_risk       ON client_intelligence_feed(risk_level);
CREATE INDEX IF NOT EXISTS idx_cif_created    ON client_intelligence_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cif_unread     ON client_intelligence_feed(organization_id) WHERE NOT is_read AND NOT is_dismissed;

-- RLS
ALTER TABLE client_intelligence_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cif_admin_all ON client_intelligence_feed;
CREATE POLICY cif_admin_all ON client_intelligence_feed
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS cif_service ON client_intelligence_feed;
CREATE POLICY cif_service ON client_intelligence_feed
  FOR ALL TO service_role
  USING (true);

DROP POLICY IF EXISTS cif_tenant_read ON client_intelligence_feed;
CREATE POLICY cif_tenant_read ON client_intelligence_feed
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. jurisdiction_intel_updates — jurisdiction-specific
--    food safety / facility safety regulatory changes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jurisdiction_intel_updates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_key  TEXT NOT NULL,
  jurisdiction_name TEXT NOT NULL,
  county            TEXT,
  state             TEXT DEFAULT 'CA',
  pillar            TEXT NOT NULL CHECK (pillar IN ('food_safety','facility_safety','both')),
  update_type       TEXT NOT NULL CHECK (update_type IN (
    'scoring_change','grading_change','inspection_frequency','enforcement_priority',
    'new_requirement','fee_change','personnel_change','methodology_change',
    'fire_code_update','hood_requirement','suppression_requirement'
  )),
  title             TEXT NOT NULL,
  description       TEXT,
  effective_date    DATE,
  risk_revenue      TEXT DEFAULT 'none' CHECK (risk_revenue     IN ('critical','high','moderate','low','none')),
  risk_liability    TEXT DEFAULT 'none' CHECK (risk_liability   IN ('critical','high','moderate','low','none')),
  risk_cost         TEXT DEFAULT 'none' CHECK (risk_cost        IN ('critical','high','moderate','low','none')),
  risk_operational  TEXT DEFAULT 'none' CHECK (risk_operational IN ('critical','high','moderate','low','none')),
  source_url        TEXT,
  source_signal_id  UUID,
  verified          BOOLEAN DEFAULT false,
  verified_by       TEXT,
  verified_at       TIMESTAMPTZ,
  published         BOOLEAN DEFAULT false,
  published_by      TEXT,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jiu_jurisdiction ON jurisdiction_intel_updates(jurisdiction_key);
CREATE INDEX IF NOT EXISTS idx_jiu_pillar       ON jurisdiction_intel_updates(pillar);
CREATE INDEX IF NOT EXISTS idx_jiu_published    ON jurisdiction_intel_updates(published);

ALTER TABLE jurisdiction_intel_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jiu_admin_all ON jurisdiction_intel_updates;
CREATE POLICY jiu_admin_all ON jurisdiction_intel_updates
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS jiu_service ON jurisdiction_intel_updates;
CREATE POLICY jiu_service ON jurisdiction_intel_updates
  FOR ALL TO service_role
  USING (true);

DROP POLICY IF EXISTS jiu_public_read ON jurisdiction_intel_updates;
CREATE POLICY jiu_public_read ON jurisdiction_intel_updates
  FOR SELECT TO authenticated
  USING (published = true);

-- ────────────────────────────────────────────────────────────
-- 5. Seed risk dimensions on existing regulatory_updates
-- ────────────────────────────────────────────────────────────
UPDATE regulatory_updates SET
  risk_revenue = CASE
    WHEN impact_level = 'critical' AND category = 'food_safety' THEN 'critical'
    WHEN impact_level = 'high' AND category = 'food_safety' THEN 'high'
    WHEN category = 'food_safety' THEN 'moderate'
    ELSE 'low'
  END,
  risk_liability = CASE
    WHEN impact_level = 'critical' THEN 'critical'
    WHEN impact_level = 'high' AND category IN ('food_safety','fire_safety') THEN 'high'
    WHEN category IN ('food_safety','fire_safety') THEN 'moderate'
    ELSE 'low'
  END,
  risk_cost = CASE
    WHEN category = 'fire_safety' AND impact_level IN ('critical','high') THEN 'high'
    WHEN category = 'environmental' THEN 'moderate'
    ELSE 'low'
  END,
  risk_operational = CASE
    WHEN impact_level = 'critical' THEN 'high'
    WHEN category IN ('labor','food_safety') THEN 'moderate'
    ELSE 'low'
  END
WHERE risk_revenue IS NULL OR risk_revenue = 'none';

-- ────────────────────────────────────────────────────────────
-- 6. Seed jurisdiction_intel_updates with demo data
-- ────────────────────────────────────────────────────────────
INSERT INTO jurisdiction_intel_updates (jurisdiction_key, jurisdiction_name, county, pillar, update_type, title, description, effective_date, risk_revenue, risk_liability, risk_cost, risk_operational, verified, published) VALUES
  ('fresno-county', 'Fresno County', 'Fresno', 'food_safety', 'inspection_frequency',
   'Fresno County increases routine inspection frequency',
   'Fresno County Environmental Health now conducts routine inspections every 6 months for high-risk facilities (previously annual). All permitted food facilities with 3+ critical violations in prior cycle are classified high-risk.',
   '2026-04-01', 'moderate', 'high', 'low', 'high', true, true),

  ('fresno-county', 'Fresno County', 'Fresno', 'food_safety', 'scoring_change',
   'Fresno County adopts weighted violation scoring',
   'Critical violations now weighted 4x (was 2x) in routine inspection scoring. Repeat critical violations within 12 months trigger mandatory re-inspection within 30 days at operator cost.',
   '2026-03-15', 'high', 'critical', 'moderate', 'high', true, true),

  ('merced-county', 'Merced County', 'Merced', 'food_safety', 'enforcement_priority',
   'Merced County EH prioritizes cold-holding compliance',
   'Following Q4 2025 outbreak investigation, Merced County has elevated cold-holding temperature compliance to priority enforcement. Inspectors now use digital probe verification on all cold-holding units.',
   '2026-02-01', 'high', 'high', 'low', 'critical', true, true),

  ('merced-county', 'Merced County', 'Merced', 'facility_safety', 'hood_requirement',
   'Merced County Fire adopts NFPA 96 2025 edition',
   'Merced County Fire Marshal now requires compliance with NFPA 96 (2025 edition) for all Type I and Type II commercial kitchen hoods. Key change: grease filter inspection frequency increased from quarterly to monthly for high-volume operations.',
   '2026-05-01', 'low', 'high', 'high', 'moderate', true, true),

  ('stanislaus-county', 'Stanislaus County', 'Stanislaus', 'food_safety', 'methodology_change',
   'Stanislaus DER adds food allergen management to inspections',
   'Stanislaus County Division of Environmental Resources has added food allergen management as a scored category in routine inspections. Facilities must demonstrate written allergen protocols and staff training records.',
   '2026-03-01', 'moderate', 'critical', 'low', 'high', true, true),

  ('stanislaus-county', 'Stanislaus County', 'Stanislaus', 'facility_safety', 'fire_code_update',
   'Stanislaus Fire implements annual hood suppression testing',
   'All commercial kitchen suppression systems in Stanislaus County now require annual UL-300 compliance testing by a certified technician. Previous requirement was biennial.',
   '2026-04-15', 'low', 'high', 'high', 'moderate', true, true),

  ('la-county', 'Los Angeles County', 'Los Angeles', 'food_safety', 'grading_change',
   'LA County updates letter grade display requirements',
   'Los Angeles County DPH mandates that facilities receiving a grade below 70 must display the numerical score on a yellow card (replacing the standard letter grade card) until re-inspection achieves 70+.',
   '2026-06-01', 'critical', 'high', 'low', 'moderate', true, true),

  ('la-county', 'Los Angeles County', 'Los Angeles', 'facility_safety', 'suppression_requirement',
   'LACoFD requires UL-300 system verification on all inspections',
   'Los Angeles County Fire Department now includes UL-300 kitchen fire suppression system verification as a mandatory checklist item on all routine inspections. Non-compliant facilities receive a Notice of Violation.',
   '2026-03-01', 'low', 'critical', 'high', 'moderate', true, true);

-- ────────────────────────────────────────────────────────────
-- 7. Seed client_intelligence_feed for demo org
-- ────────────────────────────────────────────────────────────
-- Note: In production, intelligence-deliver edge function populates this.
-- For demo, we seed directly.
INSERT INTO client_intelligence_feed (organization_id, title, summary, dimension, risk_level, feed_type, recommended_actions, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Fresno County inspection frequency increasing to semi-annual',
   'Your Downtown location is in Fresno County, which is increasing routine inspection frequency from annual to semi-annual for high-risk facilities starting April 2026. Ensure all corrective actions are resolved before the next cycle.',
   'revenue', 'high', 'jurisdiction',
   '[{"action":"Resolve all open corrective actions at Downtown location","priority":"high"},{"action":"Schedule pre-inspection internal audit","priority":"medium"},{"action":"Review Fresno County violation weighting changes","priority":"medium"}]',
   now() - interval '2 days'),

  ('00000000-0000-0000-0000-000000000001',
   'Merced County prioritizing cold-holding enforcement',
   'Your Airport location operates in Merced County, which has elevated cold-holding temperature compliance to priority enforcement following an outbreak investigation. Digital probe verification is now standard.',
   'liability', 'critical', 'jurisdiction',
   '[{"action":"Audit all cold-holding units at Airport location immediately","priority":"critical"},{"action":"Verify digital probe calibration records","priority":"high"},{"action":"Retrain staff on cold-holding protocols","priority":"medium"}]',
   now() - interval '1 day'),

  ('00000000-0000-0000-0000-000000000001',
   'Stanislaus DER adds food allergen management to inspections',
   'Your University location in Stanislaus County will be scored on food allergen management starting March 2026. Written allergen protocols and staff training records are now required.',
   'operational', 'high', 'jurisdiction',
   '[{"action":"Develop written allergen management protocol for University location","priority":"high"},{"action":"Schedule allergen awareness training for all food handlers","priority":"high"},{"action":"Create allergen ingredient tracking system","priority":"medium"}]',
   now() - interval '12 hours'),

  ('00000000-0000-0000-0000-000000000001',
   'NFPA 96 2025 edition adopted — monthly grease filter inspections',
   'Merced County Fire Marshal now requires NFPA 96 (2025) compliance. Grease filter inspection frequency increased from quarterly to monthly for high-volume operations like your Airport location.',
   'cost', 'medium', 'regulatory',
   '[{"action":"Update grease filter inspection schedule to monthly at Airport","priority":"high"},{"action":"Review NFPA 96 2025 changes with hood vendor","priority":"medium"}]',
   now() - interval '3 days'),

  ('00000000-0000-0000-0000-000000000001',
   'LA County letter grade display rule change effective June 2026',
   'Los Angeles County is updating letter grade display requirements. Facilities scoring below 70 must display numerical scores on yellow cards. This affects any future LA County expansion.',
   'revenue', 'low', 'regulatory',
   '[{"action":"Review LA County grading requirements for expansion planning","priority":"low"},{"action":"Ensure all locations maintain scores above 70","priority":"medium"}]',
   now() - interval '5 days'),

  ('00000000-0000-0000-0000-000000000001',
   'Annual hood suppression testing now required in Stanislaus County',
   'Stanislaus County Fire requires annual UL-300 compliance testing (was biennial). Your University location must schedule its next test before April 15, 2026.',
   'cost', 'high', 'jurisdiction',
   '[{"action":"Schedule UL-300 suppression test at University location","priority":"critical"},{"action":"Verify suppression system certification with vendor","priority":"high"}]',
   now() - interval '6 hours');
