-- ══════════════════════════════════════════════════════════════
-- Migration: marketing_shows table + sales_pipeline.show_id FK
-- Purpose:   Trade-show / event tracking for the Shows marketing tab.
--            Booth leads are normal sales_pipeline rows with
--            source = 'show' and show_id pointing at their show.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Create marketing_shows ─────────────────────────────────

CREATE TABLE IF NOT EXISTS marketing_shows (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  organization  TEXT,
  start_date    DATE,
  end_date      DATE,
  venue         TEXT,
  booth         TEXT,
  budget_cents  INTEGER     NOT NULL DEFAULT 0,
  leads_goal    INTEGER,
  status        TEXT        NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','registered','attended','following_up','closed')),
  staff         TEXT,
  collateral    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  marketing_shows IS 'Trade shows and events tracked by the marketing console Shows tab.';
COMMENT ON COLUMN marketing_shows.collateral IS 'Checklist object, e.g. {"banner": true, "flyers": false}.';
COMMENT ON COLUMN marketing_shows.budget_cents IS 'Total show budget in cents (USD).';
COMMENT ON COLUMN marketing_shows.staff IS 'Comma-separated list of staff attending.';

-- ── 2. Add show_id FK to sales_pipeline ───────────────────────

ALTER TABLE sales_pipeline
  ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES marketing_shows(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_pipeline_show ON sales_pipeline(show_id)
  WHERE show_id IS NOT NULL;

-- ── 3. RLS — mirror sales_pipeline policies exactly ───────────

ALTER TABLE marketing_shows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON marketing_shows;
CREATE POLICY "admin_only" ON marketing_shows
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON marketing_shows;
CREATE POLICY "service_role_all" ON marketing_shows
  FOR ALL USING (auth.role() = 'service_role');

-- ── 4. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_marketing_shows_status ON marketing_shows(status);
CREATE INDEX IF NOT EXISTS idx_marketing_shows_start  ON marketing_shows(start_date DESC);
