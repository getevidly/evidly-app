-- ============================================================
-- INTELLIGENCE DELIVERY ENGINE v2
-- Adds risk notes, recommended actions, per-dimension risk
-- levels on feed table, notification tracking, priority
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add risk notes + publish fields to intelligence_signals
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN revenue_risk_note     TEXT,
    ADD COLUMN liability_risk_note   TEXT,
    ADD COLUMN cost_risk_note        TEXT,
    ADD COLUMN operational_risk_note TEXT,
    ADD COLUMN recommended_action    TEXT,
    ADD COLUMN action_deadline       DATE,
    ADD COLUMN is_published          BOOLEAN DEFAULT false,
    ADD COLUMN published_at          TIMESTAMPTZ,
    ADD COLUMN published_by          TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Add risk notes + publish fields to regulatory_updates
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE regulatory_updates
    ADD COLUMN revenue_risk_note     TEXT,
    ADD COLUMN liability_risk_note   TEXT,
    ADD COLUMN cost_risk_note        TEXT,
    ADD COLUMN operational_risk_note TEXT,
    ADD COLUMN recommended_action    TEXT,
    ADD COLUMN action_deadline       DATE,
    ADD COLUMN is_published          BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Add per-dimension risk levels + notes + priority to
--    client_intelligence_feed
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE client_intelligence_feed
    ADD COLUMN revenue_risk_level     TEXT CHECK (revenue_risk_level IN ('critical','high','moderate','low','none','n/a')),
    ADD COLUMN liability_risk_level   TEXT CHECK (liability_risk_level IN ('critical','high','moderate','low','none','n/a')),
    ADD COLUMN cost_risk_level        TEXT CHECK (cost_risk_level IN ('critical','high','moderate','low','none','n/a')),
    ADD COLUMN operational_risk_level TEXT CHECK (operational_risk_level IN ('critical','high','moderate','low','none','n/a')),
    ADD COLUMN revenue_risk_note      TEXT,
    ADD COLUMN liability_risk_note    TEXT,
    ADD COLUMN cost_risk_note         TEXT,
    ADD COLUMN operational_risk_note  TEXT,
    ADD COLUMN recommended_action     TEXT,
    ADD COLUMN action_deadline        DATE,
    ADD COLUMN action_url             TEXT,
    ADD COLUMN location_id            UUID,
    ADD COLUMN jurisdiction_id        TEXT,
    ADD COLUMN intelligence_signal_id UUID,
    ADD COLUMN regulatory_update_id   UUID,
    ADD COLUMN source_name            TEXT,
    ADD COLUMN signal_type            TEXT,
    ADD COLUMN category               TEXT,
    ADD COLUMN priority               TEXT DEFAULT 'normal' CHECK (priority IN ('critical','high','normal','low')),
    ADD COLUMN published_at           TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN expires_at             TIMESTAMPTZ,
    ADD COLUMN notification_sent      BOOLEAN DEFAULT false,
    ADD COLUMN notification_sent_at   TIMESTAMPTZ,
    ADD COLUMN notification_channel   TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS cif_priority_idx ON client_intelligence_feed (organization_id, priority, published_at DESC);
CREATE INDEX IF NOT EXISTS cif_loc_idx      ON client_intelligence_feed (location_id);

-- ────────────────────────────────────────────────────────────
-- 4. Add risk notes + recommended_action to
--    jurisdiction_intel_updates
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE jurisdiction_intel_updates
    ADD COLUMN revenue_risk_note      TEXT,
    ADD COLUMN liability_risk_note    TEXT,
    ADD COLUMN cost_risk_note         TEXT,
    ADD COLUMN operational_risk_note  TEXT,
    ADD COLUMN recommended_action     TEXT,
    ADD COLUMN action_deadline        DATE,
    ADD COLUMN created_by             TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 5. Backfill existing client_intelligence_feed rows with
--    per-dimension risk levels from their single dimension
-- ────────────────────────────────────────────────────────────
UPDATE client_intelligence_feed SET
  revenue_risk_level     = CASE WHEN dimension = 'revenue'     THEN risk_level ELSE 'none' END,
  liability_risk_level   = CASE WHEN dimension = 'liability'   THEN risk_level ELSE 'none' END,
  cost_risk_level        = CASE WHEN dimension = 'cost'        THEN risk_level ELSE 'none' END,
  operational_risk_level = CASE WHEN dimension = 'operational' THEN risk_level ELSE 'none' END,
  priority = CASE
    WHEN risk_level IN ('critical') THEN 'critical'
    WHEN risk_level IN ('high') THEN 'high'
    ELSE 'normal'
  END
WHERE revenue_risk_level IS NULL;

-- ────────────────────────────────────────────────────────────
-- 6. Seed risk notes on regulatory_updates
-- ────────────────────────────────────────────────────────────
UPDATE regulatory_updates SET
  revenue_risk_note     = 'Inspection failure for temp violations can trigger closure or grade downgrade',
  liability_risk_note   = 'Minor violation citation risk if logs not updated',
  cost_risk_note        = 'No new equipment required — process change only',
  operational_risk_note = 'Update all TCS temp log schedules from 4hr to 2hr intervals',
  recommended_action    = 'Update your temperature log frequency to every 2 hours for all TCS foods in hot hold'
WHERE title LIKE '%Temperature Logging%' AND recommended_action IS NULL;

UPDATE regulatory_updates SET
  revenue_risk_note     = 'Non-compliant hood cleaning is a leading cause of commercial kitchen fire closure',
  liability_risk_note   = 'NFPA 96 violations create direct fire code liability — enforcement by fire marshal',
  cost_risk_note        = 'Hood cleaning service cost varies: monthly = ~$300-600/hood, weekly = ~$150-300/hood',
  operational_risk_note = 'Review cooking type per hood and schedule accordingly per Table 12.4',
  recommended_action    = 'Review your hood cleaning schedule against NFPA 96 Table 12.4 based on cooking type'
WHERE title LIKE '%Hood Cleaning%' AND recommended_action IS NULL;

UPDATE regulatory_updates SET
  liability_risk_note   = 'Fines up to $500/day for non-compliant commercial food generators',
  cost_risk_note        = 'Organics diversion program enrollment: $50-200/mo depending on hauler',
  operational_risk_note = 'Must enroll in compliant organics diversion program and document monthly',
  recommended_action    = 'Verify your facility is enrolled in a CalRecycle-compliant organics diversion program'
WHERE title LIKE '%SB 1383%' AND recommended_action IS NULL;

UPDATE regulatory_updates SET
  liability_risk_note   = 'FDA inspection findings for facilities without electronic records may cite paper-only systems',
  cost_risk_note        = 'EvidLY already satisfies electronic record requirement — no new spend required',
  operational_risk_note = 'Ensure paper backup logs are maintained alongside EvidLY digital records',
  recommended_action    = 'Continue using EvidLY for CCP monitoring records — you are already compliant'
WHERE title LIKE '%HACCP%' AND recommended_action IS NULL;

UPDATE regulatory_updates SET
  revenue_risk_note     = 'New rubric weights mean previously borderline kitchens may score lower — grade at risk',
  liability_risk_note   = 'New zero-tolerance items create immediate critical violation risk',
  cost_risk_note        = 'No equipment changes needed — training and process changes only',
  operational_risk_note = 'Review all TCS temperature verification procedures and pest prevention protocols',
  recommended_action    = 'Review LA County updated scoring rubric — verify your protocols cover new zero-tolerance violations'
WHERE title LIKE '%Grade Card Methodology%' AND recommended_action IS NULL;

UPDATE regulatory_updates SET
  liability_risk_note   = 'Cal/OSHA citation risk for kitchens above 87°F without documented cooling plan',
  cost_risk_note        = 'May require shade/cooling equipment installation: $500-3K depending on facility',
  operational_risk_note = 'Document cooling procedures, rest periods, supervisor training — maintain written records',
  recommended_action    = 'Implement and document a heat illness prevention plan if kitchen regularly exceeds 87°F'
WHERE title LIKE '%Heat Illness%' AND recommended_action IS NULL;
