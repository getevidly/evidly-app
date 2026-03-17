-- HACCP-BUILD-01: Add builder columns to haccp_plans and haccp_critical_control_points

-- intake_data stores the 7-step wizard answers as JSONB
ALTER TABLE haccp_plans
ADD COLUMN IF NOT EXISTS intake_data JSONB,
ADD COLUMN IF NOT EXISTS principle_step INTEGER DEFAULT 0;

-- NOTE: haccp_plans.status column already exists with values 'active','needs_review','archived'.
-- We add 'draft' and 'in_progress' as valid values via a new check constraint if not present.
-- Since the existing column may have a CHECK, we use a permissive approach:
DO $$ BEGIN
  ALTER TABLE haccp_plans DROP CONSTRAINT IF EXISTS haccp_plans_status_check;
  ALTER TABLE haccp_plans ADD CONSTRAINT haccp_plans_status_check
    CHECK (status IN ('draft','in_progress','complete','active','needs_review','archived'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- CCP builder fields (some may exist from prior migrations — IF NOT EXISTS handles that)
ALTER TABLE haccp_critical_control_points
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS principle_number INTEGER,
ADD COLUMN IF NOT EXISTS hazard_type TEXT,
ADD COLUMN IF NOT EXISTS verification_procedure TEXT,
ADD COLUMN IF NOT EXISTS record_keeping_text TEXT;
