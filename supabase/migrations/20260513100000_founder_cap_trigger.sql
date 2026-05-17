-- Founder pricing cap: first 250 customers, no time gate.
-- Adds CHECK constraint, BEFORE INSERT trigger, index, and public RPC.

-- 1. CHECK constraint for valid plan_tier values
ALTER TABLE organizations
  ADD CONSTRAINT chk_plan_tier
  CHECK (plan_tier IN ('trial', 'founder', 'standard', 'enterprise'));

-- 2. Dedicated index for fast founder count
CREATE INDEX IF NOT EXISTS idx_organizations_plan_tier
  ON organizations (plan_tier);

-- 3. Trigger function: atomic tier assignment on org creation
CREATE OR REPLACE FUNCTION assign_plan_tier_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  founder_count integer;
BEGIN
  -- Only intercept rows arriving with the default 'trial' tier.
  -- Preserves manual 'enterprise' or direct 'standard' assignments.
  IF NEW.plan_tier <> 'trial' THEN
    RETURN NEW;
  END IF;

  -- Advisory lock prevents concurrent inserts from exceeding cap
  PERFORM pg_advisory_xact_lock(hashtext('founder_cap'));

  SELECT count(*) INTO founder_count
    FROM organizations
   WHERE plan_tier = 'founder';

  IF founder_count < 250 THEN
    NEW.plan_tier := 'founder';
  ELSE
    NEW.plan_tier := 'standard';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach trigger
CREATE TRIGGER trg_assign_plan_tier
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION assign_plan_tier_on_create();

-- 5. Public RPC for founder count (callable by anon for public pages)
CREATE OR REPLACE FUNCTION public.get_founder_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT count(*)::integer FROM organizations WHERE plan_tier = 'founder';
$$;
