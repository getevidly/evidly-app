-- ══════════════════════════════════════════════════════════════
-- Migration: partner_applications.is_published
-- Purpose:   The publish gate for the Trusted Partner Alliance
--            listing. partner-listing returns rows where this is
--            true and nothing else.
--
--            Defaults to false, so an application appearing in the
--            table never appears on the public page. Arthur flips
--            it per partner after review — submitting an
--            application is not the same as being listed.
--
--            NOT NULL with a default, so existing rows are
--            backfilled to false by the ALTER itself.
--
--            Defensive: ADD COLUMN IF NOT EXISTS, safe to re-run.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;
