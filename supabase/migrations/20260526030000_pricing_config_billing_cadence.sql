-- Pricing config + billing cadence + infrastructure columns
-- Sections A, C, F of Billing Prompt

-- ── A. pricing_config singleton table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id             integer PRIMARY KEY CHECK (id = 1),
  -- Essentials
  essentials_monthly            numeric NOT NULL DEFAULT 69,
  essentials_annual             numeric NOT NULL DEFAULT 690,
  essentials_additional_monthly numeric NOT NULL DEFAULT 39,
  essentials_additional_annual  numeric NOT NULL DEFAULT 390,
  -- Founder (lock-window pricing)
  founder_monthly               numeric NOT NULL DEFAULT 99,
  founder_annual                numeric NOT NULL DEFAULT 1188,
  founder_additional_monthly    numeric NOT NULL DEFAULT 49,
  founder_additional_annual     numeric NOT NULL DEFAULT 588,
  -- Standard (post-window pricing)
  standard_monthly              numeric NOT NULL DEFAULT 199,
  standard_annual               numeric NOT NULL DEFAULT 1990,
  standard_additional_monthly   numeric NOT NULL DEFAULT 99,
  standard_additional_annual    numeric NOT NULL DEFAULT 990,
  -- Caps + durations
  trial_days                    integer NOT NULL DEFAULT 30,
  founder_lock_months           integer NOT NULL DEFAULT 36,
  founder_seats_max             integer NOT NULL DEFAULT 250,
  -- Timestamps
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed the single row
INSERT INTO public.pricing_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone authenticated can read, only service_role can write
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_config_read"
  ON public.pricing_config FOR SELECT
  TO authenticated
  USING (true);

-- Grant usage
GRANT SELECT ON public.pricing_config TO authenticated;
GRANT ALL    ON public.pricing_config TO service_role;

-- ── C. billing_cadence column on organizations ─────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_cadence text NOT NULL DEFAULT 'monthly'
  CHECK (billing_cadence IN ('monthly', 'annual'));

-- ── F. Infrastructure columns for future Prompt B ──────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_expired_at timestamptz;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS founder_expiration_notice_sent_60d_at timestamptz;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS founder_expiration_notice_sent_30d_at timestamptz;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS post_founder_transitioned_at timestamptz;
