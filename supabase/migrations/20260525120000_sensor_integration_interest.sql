-- Sensor early-access interest capture
CREATE TABLE sensor_integration_interest (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid,
  user_id          uuid,
  email            text        NOT NULL,
  vendor           text,
  vendor_free_text text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sensor_integration_interest ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can register interest
CREATE POLICY sii_insert ON sensor_integration_interest
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Read restricted to service role only
CREATE POLICY sii_read_admin ON sensor_integration_interest
  FOR SELECT USING (false);
