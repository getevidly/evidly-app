-- ════════════════════════════════════════════════════════════
-- CANONICAL ENGINE UPGRADE
-- Adds opportunity dimensions (the upside of acting early),
-- industry + county targeting on signals, and relevance
-- personalization on the client feed.
-- ════════════════════════════════════════════════════════════

-- ── 1. intelligence_signals: targeting + opportunity ──────
DO $$ BEGIN
  ALTER TABLE intelligence_signals
    ADD COLUMN target_industries      TEXT[] DEFAULT '{}',
    ADD COLUMN target_counties        TEXT[] DEFAULT '{}',
    ADD COLUMN target_all_industries  BOOLEAN DEFAULT true,
    ADD COLUMN signal_scope           TEXT DEFAULT 'statewide'
      CHECK (signal_scope IN ('national','statewide','regional','county','facility')),
    ADD COLUMN opp_revenue            TEXT DEFAULT 'none'
      CHECK (opp_revenue IN ('critical','high','moderate','low','none')),
    ADD COLUMN opp_liability          TEXT DEFAULT 'none'
      CHECK (opp_liability IN ('critical','high','moderate','low','none')),
    ADD COLUMN opp_cost               TEXT DEFAULT 'none'
      CHECK (opp_cost IN ('critical','high','moderate','low','none')),
    ADD COLUMN opp_operational        TEXT DEFAULT 'none'
      CHECK (opp_operational IN ('critical','high','moderate','low','none')),
    ADD COLUMN opp_revenue_note       TEXT,
    ADD COLUMN opp_liability_note     TEXT,
    ADD COLUMN opp_cost_note          TEXT,
    ADD COLUMN opp_operational_note   TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 2. regulatory_updates: targeting + opportunity ────────
DO $$ BEGIN
  ALTER TABLE regulatory_updates
    ADD COLUMN target_industries             TEXT[] DEFAULT '{}',
    ADD COLUMN target_counties               TEXT[] DEFAULT '{}',
    ADD COLUMN target_all_industries         BOOLEAN DEFAULT true,
    ADD COLUMN signal_scope                  TEXT DEFAULT 'statewide',
    ADD COLUMN opp_revenue                   TEXT DEFAULT 'none',
    ADD COLUMN opp_liability                 TEXT DEFAULT 'none',
    ADD COLUMN opp_cost                      TEXT DEFAULT 'none',
    ADD COLUMN opp_operational               TEXT DEFAULT 'none',
    ADD COLUMN opp_revenue_note              TEXT,
    ADD COLUMN opp_liability_note            TEXT,
    ADD COLUMN opp_cost_note                 TEXT,
    ADD COLUMN opp_operational_note          TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 3. jurisdiction_intel_updates: opportunity + targeting ─
DO $$ BEGIN
  ALTER TABLE jurisdiction_intel_updates
    ADD COLUMN target_industries             TEXT[] DEFAULT '{}',
    ADD COLUMN target_all_industries         BOOLEAN DEFAULT true,
    ADD COLUMN opp_revenue                   TEXT DEFAULT 'none',
    ADD COLUMN opp_liability                 TEXT DEFAULT 'none',
    ADD COLUMN opp_cost                      TEXT DEFAULT 'none',
    ADD COLUMN opp_operational               TEXT DEFAULT 'none',
    ADD COLUMN opp_revenue_note              TEXT,
    ADD COLUMN opp_liability_note            TEXT,
    ADD COLUMN opp_cost_note                 TEXT,
    ADD COLUMN opp_operational_note          TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 4. client_intelligence_feed: opportunity + relevance ──
DO $$ BEGIN
  ALTER TABLE client_intelligence_feed
    ADD COLUMN opp_revenue_level             TEXT
      CHECK (opp_revenue_level IN ('critical','high','moderate','low','none','n/a')),
    ADD COLUMN opp_liability_level           TEXT
      CHECK (opp_liability_level IN ('critical','high','moderate','low','none','n/a')),
    ADD COLUMN opp_cost_level                TEXT
      CHECK (opp_cost_level IN ('critical','high','moderate','low','none','n/a')),
    ADD COLUMN opp_operational_level         TEXT
      CHECK (opp_operational_level IN ('critical','high','moderate','low','none','n/a')),
    ADD COLUMN opp_revenue_note              TEXT,
    ADD COLUMN opp_liability_note            TEXT,
    ADD COLUMN opp_cost_note                 TEXT,
    ADD COLUMN opp_operational_note          TEXT,
    ADD COLUMN relevance_reason              TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
