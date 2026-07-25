-- ============================================================
-- MARKET RESEARCH RESPONSES — cold-prospect survey (Phase 4)
-- ============================================================
-- NOT kitchen_checkups (that is a customer self-assessment with
-- its own scoring engine — a different instrument entirely).
--
-- 10 questions across 3 sections.  Typed columns + text[] arrays
-- so every answer is queryable in SQL without JSON gymnastics.
-- Edge function survey-response writes via service_role.
-- ============================================================

CREATE TABLE IF NOT EXISTS market_research_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_token   TEXT,                                       -- links to cold invite
  -- Q1-Q4  qualifiers
  org_name         TEXT,
  contact_name     TEXT,
  contact_email    TEXT,
  segment          TEXT,
  kitchen_count    TEXT,
  county_id        UUID REFERENCES jurisdictions(id),
  role             TEXT,
  -- Q5-Q8  compliance today
  record_locations TEXT[],
  due_discovery    TEXT,
  hardest_parts    TEXT[],
  asked_by         TEXT[],
  -- Q9-Q10 solution
  would_pay_for    TEXT,
  open_answer      TEXT,
  -- timestamps
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS: staff-only read, NO anon access.  Edge fn uses service_role.
ALTER TABLE market_research_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read" ON market_research_responses;
CREATE POLICY "staff_read" ON market_research_responses FOR SELECT
  USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON market_research_responses;
CREATE POLICY "service_role_all" ON market_research_responses FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for the Survey admin tab correlations
CREATE INDEX IF NOT EXISTS idx_mrr_completed ON market_research_responses(completed_at);
CREATE INDEX IF NOT EXISTS idx_mrr_segment   ON market_research_responses(segment);
CREATE INDEX IF NOT EXISTS idx_mrr_county    ON market_research_responses(county_id);
