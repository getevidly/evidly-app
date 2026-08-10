-- ============================================================
-- Add brand, body, cta, post_type columns to content_schedule
-- ============================================================
-- Four nullable TEXT columns for the content import.
-- Uses IF NOT EXISTS so re-running is safe.
-- ============================================================

ALTER TABLE public.content_schedule ADD COLUMN IF NOT EXISTS brand     TEXT;
ALTER TABLE public.content_schedule ADD COLUMN IF NOT EXISTS body      TEXT;
ALTER TABLE public.content_schedule ADD COLUMN IF NOT EXISTS cta       TEXT;
ALTER TABLE public.content_schedule ADD COLUMN IF NOT EXISTS post_type TEXT;
