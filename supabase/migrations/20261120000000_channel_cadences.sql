-- ══════════════════════════════════════════════════════════════
-- Migration: create channel_cadences table
-- Purpose:   Stores per-channel sales activity targets (e.g.
--            "10 outbound calls per weekday", "3 field days per
--            week"). source_value links to sales_pipeline.source
--            so actuals can be counted. No seed data — Arthur
--            enters cadences through the UI.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.channel_cadences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key   TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  source_value  TEXT,
  stage         TEXT NOT NULL DEFAULT 'development'
                CHECK (stage IN ('live', 'outreach', 'development')),
  cadence_type  TEXT NOT NULL DEFAULT 'none'
                CHECK (cadence_type IN ('per_weekday', 'per_week', 'none')),
  target_count  INTEGER,
  owner         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS — mirrors sales_pipeline policies exactly ─────────────

ALTER TABLE public.channel_cadences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON public.channel_cadences;
CREATE POLICY "admin_only" ON public.channel_cadences
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com');

DROP POLICY IF EXISTS "service_role_all" ON public.channel_cadences;
CREATE POLICY "service_role_all" ON public.channel_cadences
  FOR ALL USING (auth.role() = 'service_role');

REVOKE ALL ON public.channel_cadences FROM anon, PUBLIC;
