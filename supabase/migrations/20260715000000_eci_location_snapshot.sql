-- Add location_snapshot to evidly_client_invites
-- Stores org created_at + primary location address at invite creation time
-- so the /join/:token page can display them without authenticated queries.

ALTER TABLE public.evidly_client_invites
  ADD COLUMN IF NOT EXISTS location_snapshot jsonb;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260715000000', 'eci_location_snapshot') ON CONFLICT DO NOTHING;
