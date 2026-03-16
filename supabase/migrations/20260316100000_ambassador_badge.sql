-- AMBASSADOR-SCRIPT-01: Ambassador Badge columns
-- Operators who refer 3+ active clients earn Ambassador status

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_ambassador BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ambassador_since TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_ambassador
  ON public.organizations(is_ambassador)
  WHERE is_ambassador = true;
