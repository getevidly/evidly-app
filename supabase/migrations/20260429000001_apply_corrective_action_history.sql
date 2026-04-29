-- Apply missing parts of 20260415000001 (corrective action lifecycle)
-- NOTE: corrective_actions.status CHECK constraint already includes
-- ('reported','assigned','in_progress','resolved','verified','closed','archived').
-- Left as-is — no scope creep.

-- 1. Add missing resolved_at column
ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_ca_resolved_at ON corrective_actions(resolved_at);

-- 2. Create audit history table
CREATE TABLE IF NOT EXISTS corrective_action_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  corrective_action_id uuid NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_value text,
  to_value text,
  performed_by uuid REFERENCES auth.users(id),
  performed_by_name text,
  detail text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ca_history_action_id ON corrective_action_history(corrective_action_id);

-- 3. RLS (location-scoped via user_location_access, matching corrective_actions convention)
-- No UPDATE/DELETE policies — history rows are immutable for audit integrity.
ALTER TABLE corrective_action_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corrective_action_history_select" ON corrective_action_history;
CREATE POLICY "corrective_action_history_select" ON corrective_action_history
  FOR SELECT USING (
    corrective_action_id IN (
      SELECT id FROM corrective_actions
      WHERE location_id IN (
        SELECT location_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "corrective_action_history_insert" ON corrective_action_history;
CREATE POLICY "corrective_action_history_insert" ON corrective_action_history
  FOR INSERT WITH CHECK (
    corrective_action_id IN (
      SELECT id FROM corrective_actions
      WHERE location_id IN (
        SELECT location_id FROM user_location_access WHERE user_id = auth.uid()
      )
    )
  );
