-- Add default per-visit pricing for FPM/RGC/GFX add-on services
-- Values stored as integer cents for consistency with billing patterns.

ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS fpm_default_visit_cents integer NOT NULL DEFAULT 18500;

ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS rgc_default_visit_cents integer NOT NULL DEFAULT 14500;

ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS gfx_default_visit_cents integer NOT NULL DEFAULT 9500;
