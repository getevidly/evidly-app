-- 20260626010000_pl_sealed_reports
-- Immutable sealed initial-report record (E&O tamper-evidence).
-- Mirrors drift_resolutions write-once pattern.
-- One seal per run (run_id UNIQUE).

-- ── Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pl_sealed_reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid        NOT NULL UNIQUE REFERENCES pl_extraction_runs(id),
  intake_id     uuid        NOT NULL REFERENCES policy_lens_intakes(id),
  report_jsonb  jsonb       NOT NULL,
  content_hash  text        NOT NULL,
  sealed_at     timestamptz NOT NULL,
  sealed_by     uuid        NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Write-once triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION tg_pl_sealed_reports_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'pl_sealed_reports rows are immutable once sealed. Attempted: %', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pl_sealed_no_update ON pl_sealed_reports;
CREATE TRIGGER pl_sealed_no_update BEFORE UPDATE ON pl_sealed_reports
  FOR EACH ROW EXECUTE FUNCTION tg_pl_sealed_reports_immutable();

DROP TRIGGER IF EXISTS pl_sealed_no_delete ON pl_sealed_reports;
CREATE TRIGGER pl_sealed_no_delete BEFORE DELETE ON pl_sealed_reports
  FOR EACH ROW EXECUTE FUNCTION tg_pl_sealed_reports_immutable();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE pl_sealed_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plsr_admin_select ON pl_sealed_reports;
CREATE POLICY plsr_admin_select ON pl_sealed_reports
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role::text = 'platform_admin'
  ));

DROP POLICY IF EXISTS plsr_service_role ON pl_sealed_reports;
CREATE POLICY plsr_service_role ON pl_sealed_reports
  FOR ALL TO public
  USING (auth.role() = 'service_role');

-- ── Record migration ──────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260626010000', 'pl_sealed_reports')
ON CONFLICT DO NOTHING;
