-- ═══════════════════════════════════════════════════════════════════════
-- JURISDICTION EDITS — Audit history for manual edits to jurisdictions
-- Tracks before/after per field so any bad edit can be identified and
-- reversed without checking git migration history.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jurisdiction_edits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  county        TEXT NOT NULL,
  batch_id      UUID NOT NULL DEFAULT gen_random_uuid(),

  field_name    TEXT NOT NULL,
  old_value     JSONB,
  new_value     JSONB,

  edited_by     TEXT NOT NULL DEFAULT 'platform_admin',
  edit_reason   TEXT,
  edited_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jur_edits_jurisdiction
  ON jurisdiction_edits(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_jur_edits_county
  ON jurisdiction_edits(county);
CREATE INDEX IF NOT EXISTS idx_jur_edits_batch
  ON jurisdiction_edits(batch_id);
CREATE INDEX IF NOT EXISTS idx_jur_edits_edited_at
  ON jurisdiction_edits(edited_at DESC);

ALTER TABLE jurisdiction_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jurisdiction_edits platform_admin full access" ON jurisdiction_edits;
CREATE POLICY "jurisdiction_edits platform_admin full access"
  ON jurisdiction_edits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'platform_admin'
    )
  );

COMMENT ON TABLE jurisdiction_edits IS
  'Audit trail for manual edits to the canonical jurisdictions table. '
  'Each row records one field change; rows sharing a batch_id were saved together.';
