-- ══════════════════════════════════════════════════════════════
-- Migration: create pipeline_touches table
-- Purpose:   Records every sales touch (call, email, visit, etc.)
--            against a sales_pipeline row. Enables cadence-vs-actual
--            reporting and links each touch back to the follow-up
--            date it was fulfilling. No seed data.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pipeline_touches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id     UUID NOT NULL
                  REFERENCES public.sales_pipeline (id) ON DELETE CASCADE,
  touched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  touch_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  touch_type      TEXT NOT NULL DEFAULT 'other'
                  CHECK (touch_type IN ('call', 'email', 'in_person', 'show', 'other')),
  outcome         TEXT
                  CHECK (outcome IS NULL OR outcome IN ('connected', 'no_answer', 'not_now', 'not_a_fit', 'other')),
  note            TEXT,
  next_action_set DATE,
  was_due_on      DATE,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pipeline_touches_pipeline_id
  ON public.pipeline_touches (pipeline_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_touches_touch_date
  ON public.pipeline_touches (touch_date);

CREATE INDEX IF NOT EXISTS idx_pipeline_touches_was_due_on
  ON public.pipeline_touches (was_due_on)
  WHERE was_due_on IS NOT NULL;

-- ── RLS — mirrors sales_pipeline policies exactly ───────────

ALTER TABLE public.pipeline_touches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON public.pipeline_touches;
CREATE POLICY "admin_only" ON public.pipeline_touches
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON public.pipeline_touches;
CREATE POLICY "service_role_all" ON public.pipeline_touches
  FOR ALL USING (auth.role() = 'service_role');

REVOKE ALL ON public.pipeline_touches FROM anon, PUBLIC;
