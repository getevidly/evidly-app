-- =====================================================================
-- vendor_recommendations — Roster → Vendor Network recommendation pipeline
-- =====================================================================
-- A. Create vendor_recommendations table
-- B. Indexes (org, status, unique per-org active)
-- C. RLS: service_role ALL, authenticated INSERT+SELECT own org
-- =====================================================================

BEGIN;

-- ─── A. Create table ───────────────────────────────────────────────
CREATE TABLE vendor_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  source_roster_vendor_id uuid REFERENCES vendors(id),
  vendor_name text NOT NULL,
  services text[] NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  counties_served text[] NOT NULL,
  years_working_together smallint,
  approx_visit_count integer,
  why_recommended text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','under_review','approved','declined')),
  submitted_by uuid REFERENCES user_profiles(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── B. Indexes ────────────────────────────────────────────────────
CREATE INDEX idx_vendor_recommendations_org ON vendor_recommendations(organization_id);
CREATE INDEX idx_vendor_recommendations_status ON vendor_recommendations(status);
CREATE UNIQUE INDEX idx_vendor_recommendations_unique_per_org
  ON vendor_recommendations(organization_id, source_roster_vendor_id)
  WHERE source_roster_vendor_id IS NOT NULL
    AND status IN ('pending_review','under_review','approved');

-- ─── C. RLS ────────────────────────────────────────────────────────
ALTER TABLE vendor_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON vendor_recommendations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "auth_insert_own_org" ON vendor_recommendations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "auth_select_own_org" ON vendor_recommendations
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ─── Register migration ───────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260526010000');

COMMIT;
