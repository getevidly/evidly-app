-- drift_catches: add requirement-dimension columns for compliance monitor alerts.
-- Existing jurisdiction-drift rows pre-date these columns; all nullable.

ALTER TABLE drift_catches
  ADD COLUMN dimension            text,
  ADD COLUMN requirement_source   text,
  ADD COLUMN requirement_version  text;

CREATE INDEX idx_drift_catches_loc_pillar_dim
  ON drift_catches (location_id, pillar, dimension);

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260917100000')
ON CONFLICT DO NOTHING;
