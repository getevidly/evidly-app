-- Insurance Share Links
-- Allows org users to generate time-limited shareable links for insurance risk reports.

CREATE TABLE IF NOT EXISTS insurance_share_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id   uuid REFERENCES locations(id) ON DELETE SET NULL,
  token         text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for fast token lookups on the public share route
CREATE INDEX IF NOT EXISTS idx_insurance_share_links_token ON insurance_share_links(token);

-- RLS
ALTER TABLE insurance_share_links ENABLE ROW LEVEL SECURITY;

-- Org members can create and view their own share links
CREATE POLICY "org_members_manage_share_links" ON insurance_share_links
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Anonymous users can read a share link if token is valid and not expired
CREATE POLICY "anon_read_valid_share_links" ON insurance_share_links
  FOR SELECT USING (
    expires_at > now()
  );
