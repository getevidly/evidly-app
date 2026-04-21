-- ============================================================
-- POS Integration: Employee Staging + Missing Catalog Entries
-- ============================================================

-- ── 1. pos_employee_mappings — staging table for POS employees ──
-- Employees sync from POS → here for admin review before activation.
-- Admin reviews, then invites via user_invitations table.

CREATE TABLE IF NOT EXISTS pos_employee_mappings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pos_connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  pos_employee_id   TEXT NOT NULL,
  pos_type          TEXT NOT NULL,
  first_name        TEXT,
  last_name         TEXT,
  email             TEXT,
  role              TEXT,
  is_active         BOOLEAN DEFAULT true,
  evidly_user_id    UUID REFERENCES auth.users(id),
  staged_at         TIMESTAMPTZ DEFAULT now(),
  invited_at        TIMESTAMPTZ,
  UNIQUE (pos_connection_id, pos_employee_id)
);

ALTER TABLE pos_employee_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_employees_org_access" ON pos_employee_mappings;
CREATE POLICY "pos_employees_org_access" ON pos_employee_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = pos_employee_mappings.organization_id
        AND user_profiles.role IN ('platform_admin', 'owner_operator', 'executive')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pos_employee_org ON pos_employee_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pos_employee_conn ON pos_employee_mappings(pos_connection_id);

-- ── 2. Add missing POS systems to integrations catalog ──────────
-- Only if the integrations table has the expected schema
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'category') THEN
  INSERT INTO integrations (name, slug, description, category, status, is_featured) VALUES
    ('Lightspeed Restaurant', 'lightspeed-pos', 'Lightspeed Restaurant POS for menu management, table service, and reporting.',          'pos', 'available',   false),
    ('Revel Systems',         'revel-pos',      'Revel iPad POS with employee management, inventory, and multi-location support.',       'pos', 'available',   false),
    ('SpotOn',                'spoton-pos',     'SpotOn restaurant POS with online ordering, reservations, and loyalty integration.',     'pos', 'available',   false),
    ('Heartland',             'heartland-pos',  'Heartland payment and POS solutions for restaurants and hospitality.',                   'pos', 'coming_soon', false)
  ON CONFLICT (slug) DO NOTHING;
END IF;
END $$;

-- ── 3. Nightly POS sync cron (2am daily) ────────────────────────
-- Requires pg_cron and pg_net extensions (enabled in Supabase by default).
-- Calls pos-sync-all edge function to sync all active POS connections.

-- NOTE: Run this manually in SQL Editor if cron/net extensions are available:
-- SELECT cron.schedule(
--   'evidly-pos-nightly-sync',
--   '0 2 * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/pos-sync-all',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
