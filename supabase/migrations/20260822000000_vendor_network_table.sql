-- ============================================================
-- 20260822000000_vendor_network_table.sql
-- Stage B: Vendor Network directory table (admin-managed, shared)
-- + Fix message_threads unique constraint for multi-org threads
-- ============================================================

-- ── 1. Vendor Network directory ──────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_network (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  contact_name          text,
  email                 text NOT NULL,
  phone                 text,
  service_types         text[] NOT NULL DEFAULT '{}',
  county_primary        text NOT NULL,
  service_area_counties text[] NOT NULL DEFAULT '{}',
  tier                  text NOT NULL DEFAULT 'bronze'
                          CHECK (tier IN ('gold', 'silver', 'bronze')),
  credentials           jsonb NOT NULL DEFAULT '{"ikeca": false, "nfpa": false, "insured": false}',
  availability          text NOT NULL DEFAULT 'available'
                          CHECK (availability IN ('available', 'wait_list')),
  rating                numeric,
  joined_at             timestamptz NOT NULL DEFAULT now(),
  is_active             boolean NOT NULL DEFAULT true,
  notes                 text,
  distance_zip          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_network_tier ON vendor_network (tier);
CREATE INDEX idx_vendor_network_county ON vendor_network (county_primary);
CREATE INDEX idx_vendor_network_service_types ON vendor_network USING GIN (service_types);
CREATE INDEX idx_vendor_network_availability ON vendor_network (availability);
CREATE INDEX idx_vendor_network_active ON vendor_network (is_active) WHERE is_active = true;

ALTER TABLE vendor_network ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read (directory is shared across orgs)
CREATE POLICY "Authenticated users can view vendor network"
  ON vendor_network FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Only service_role can mutate (admin-managed)
CREATE POLICY "Service role can manage vendor network"
  ON vendor_network FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. Fix message_threads unique constraint ─────────────────────
-- Old constraint: UNIQUE(entity_type, entity_id)
-- Problem: vendor_network_contact threads are per-org for the same vendor
-- New constraint: UNIQUE(entity_type, entity_id, organization_id)

ALTER TABLE message_threads
  DROP CONSTRAINT IF EXISTS message_threads_entity_type_entity_id_key;

ALTER TABLE message_threads
  ADD CONSTRAINT message_threads_entity_type_entity_id_org_key
  UNIQUE (entity_type, entity_id, organization_id);
