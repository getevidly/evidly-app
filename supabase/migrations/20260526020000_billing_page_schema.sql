-- Billing page schema updates:
-- 1. Remove cpp_free from plan_tier, add essentials
-- 2. Add founder_locked_at to organizations
-- 3. Add location pricing columns
-- 4. Add fn_founder_seats_taken / fn_founder_seats_max RPCs

-- ── 1. Migrate cpp_free → trial, update constraint ──────────
UPDATE organizations SET plan_tier = 'trial' WHERE plan_tier = 'cpp_free';

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_plan_tier;
ALTER TABLE organizations ADD CONSTRAINT chk_plan_tier
  CHECK (plan_tier IN ('trial', 'essentials', 'founder', 'standard', 'enterprise'));

-- ── 2. founder_locked_at column ─────────────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS founder_locked_at timestamptz;

UPDATE organizations
  SET founder_locked_at = created_at
  WHERE plan_tier = 'founder'
    AND founder_locked_at IS NULL;

-- ── 2b. founder_lock_expires_at column ─────────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS founder_lock_expires_at timestamptz;

UPDATE organizations
  SET founder_lock_expires_at = founder_locked_at + interval '36 months'
  WHERE founder_locked_at IS NOT NULL
    AND founder_lock_expires_at IS NULL;

-- ── 3. Location pricing columns ─────────────────────────────
ALTER TABLE locations ADD COLUMN IF NOT EXISTS monthly_price_locked numeric;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS price_locked_at timestamptz;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_included_in_base boolean NOT NULL DEFAULT false;

-- ── 4. Founder seat RPCs ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_founder_seats_taken()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT count(*)::integer FROM organizations WHERE plan_tier = 'founder';
$$;

CREATE OR REPLACE FUNCTION public.fn_founder_seats_max()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 250;
$$;

-- ── 5. Update trigger to handle essentials tier ─────────────
CREATE OR REPLACE FUNCTION assign_plan_tier_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  founder_count integer;
BEGIN
  -- Only intercept rows arriving with 'trial' tier.
  -- Preserves manual 'enterprise', 'essentials', or direct 'standard' assignments.
  IF NEW.plan_tier <> 'trial' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('founder_cap'));

  SELECT count(*) INTO founder_count
    FROM organizations
   WHERE plan_tier = 'founder';

  IF founder_count < 250 THEN
    NEW.plan_tier := 'founder';
    NEW.founder_locked_at := now();
    NEW.founder_lock_expires_at := now() + interval '36 months';
  ELSE
    NEW.plan_tier := 'standard';
  END IF;

  RETURN NEW;
END;
$$;
