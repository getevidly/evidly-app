-- ═══════════════════════════════════════════════════════════════════
-- GAP-01: Corrective Action Tracking Enhancements
-- ═══════════════════════════════════════════════════════════════════
-- Adds source tracking, notes, attachments, and assigned_by fields
-- to the corrective_actions table for full lifecycle tracking.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Source tracking ──────────────────────────────────────────

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) DEFAULT 'manual'
    CHECK (source_type IN ('inspection', 'checklist', 'temperature', 'self_inspection', 'manual'));

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS source_id UUID;

COMMENT ON COLUMN corrective_actions.source_type IS
  'How this corrective action was triggered: inspection finding, checklist failure, temperature excursion, self-inspection, or manual entry.';

COMMENT ON COLUMN corrective_actions.source_id IS
  'FK to the source record (inspection_id, checklist_response_id, temp_log_id, etc.). NULL for manual entries.';

-- ── 2. Assignment tracking ──────────────────────────────────────

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS assigned_by_user_id UUID;

COMMENT ON COLUMN corrective_actions.assigned_by_user_id IS
  'User who created/assigned this corrective action. Distinct from assignee_id (who is assigned TO do the work).';

-- ── 3. Notes (append-only comments) ────────────────────────────

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN corrective_actions.notes IS
  'Append-only array of {text, author, timestamp} comment objects. Each note is immutable once added.';

-- ── 4. Attachments ──────────────────────────────────────────────

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN corrective_actions.attachments IS
  'Array of {name, url, type} file attachment references. URLs point to Supabase Storage objects.';

-- ── 5. Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ca_source_type
  ON corrective_actions(source_type);

CREATE INDEX IF NOT EXISTS idx_ca_status_due
  ON corrective_actions(status, due_date);
