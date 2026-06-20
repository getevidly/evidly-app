-- pl_findings provenance anchor: stamp each finding with the extraction run
-- identity and release state it was built from, enabling supersession detection.

ALTER TABLE pl_findings
  ADD COLUMN source_run_id           uuid,
  ADD COLUMN source_document_id      uuid,
  ADD COLUMN release_status_at_build text;

CREATE INDEX idx_pl_findings_source_run_id ON pl_findings (source_run_id);

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260917000000')
ON CONFLICT DO NOTHING;
