-- CORRECTIVE-ACTION-01: Lifecycle pipeline upgrade
-- Status pipeline: reported → assigned → in_progress → resolved → verified

-- ── 1. Add new columns ──────────────────────────────────────

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS ai_draft text;

-- ── 2. Migrate existing status values ───────────────────────

UPDATE corrective_actions SET status = 'reported'  WHERE status = 'created';
UPDATE corrective_actions SET status = 'resolved'  WHERE status = 'completed';
UPDATE corrective_actions SET resolved_at = completed_at WHERE status = 'resolved' AND completed_at IS NOT NULL;

-- For closed/archived items, treat as verified (terminal state)
UPDATE corrective_actions SET status = 'verified'  WHERE status IN ('closed', 'archived');

-- ── 3. Update status CHECK constraint ───────────────────────

ALTER TABLE corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_status_check;
ALTER TABLE corrective_actions
  ADD CONSTRAINT corrective_actions_status_check
  CHECK (status IN ('reported', 'assigned', 'in_progress', 'resolved', 'verified'));

-- ── 4. Create audit history table ───────────────────────────

CREATE TABLE IF NOT EXISTS corrective_action_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  corrective_action_id uuid NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'status_changed', 'reassigned', 'note_added', 'attachment_added'
  from_value text,
  to_value text,
  performed_by uuid REFERENCES auth.users(id),
  performed_by_name text,
  detail text,
  created_at timestamptz DEFAULT now()
);

-- ── 5. Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ca_history_action_id ON corrective_action_history(corrective_action_id);
CREATE INDEX IF NOT EXISTS idx_ca_assigned_at ON corrective_actions(assigned_at);
CREATE INDEX IF NOT EXISTS idx_ca_resolved_at ON corrective_actions(resolved_at);

-- ── 6. RLS ──────────────────────────────────────────────────

ALTER TABLE corrective_action_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_ca_history" ON corrective_action_history;
CREATE POLICY "org_read_ca_history" ON corrective_action_history
  FOR SELECT USING (
    corrective_action_id IN (
      SELECT id FROM corrective_actions
      WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "org_insert_ca_history" ON corrective_action_history;
CREATE POLICY "org_insert_ca_history" ON corrective_action_history
  FOR INSERT WITH CHECK (
    corrective_action_id IN (
      SELECT id FROM corrective_actions
      WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );
