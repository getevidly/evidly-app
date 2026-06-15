/*
 * 20260916000000_external_parties_foundation.sql
 *
 * Partner portal foundation — Step 1.
 *
 * Creates:
 *   A) external_parties        — directory of carriers, brokers, property managers
 *   B) external_party_members  — links auth.users → external_parties (portal scoping)
 *   C) locations columns       — carrier_id, broker_id, pm_id nullable FKs
 *   D) Two-way RLS             — can_party_access_location() SECURITY DEFINER +
 *                                 additive PERMISSIVE policies
 *
 * SAFETY: All new RLS is PERMISSIVE / additive. No existing policies on locations
 * (or any other table) are modified, dropped, or tightened. Existing operator and
 * kitchen access via user_location_access + can_access_location() is unchanged.
 *
 * On day-0 all three FK columns are NULL and external_party_members is empty,
 * so the new "Party members can view assigned locations" policy grants zero
 * additional access until parties are assigned and members provisioned.
 */

-- ══════════════════════════════════════════════════════════════════════
-- A) external_parties — carrier / broker / property-manager directory
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.external_parties (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type            text NOT NULL CHECK (party_type IN ('carrier', 'broker', 'pm')),
  legal_name            text NOT NULL,
  display_name          text,
  normalized_name       text NOT NULL UNIQUE,
  authoritative_id      text,
  authoritative_id_type text,
  logo_url              text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.external_parties.normalized_name IS
  'lower(trim(legal_name)) — app writes this; UNIQUE enforces dedup / typo-proofing';
COMMENT ON COLUMN public.external_parties.authoritative_id IS
  'NAIC code (carrier), NPN (broker), nullable for pm';
COMMENT ON COLUMN public.external_parties.authoritative_id_type IS
  'NAIC | NPN | NULL';

CREATE INDEX IF NOT EXISTS idx_external_parties_type
  ON public.external_parties (party_type);

-- ══════════════════════════════════════════════════════════════════════
-- B) external_party_members — links auth.users → a single party
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.external_party_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id   uuid NOT NULL REFERENCES public.external_parties(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_external_party_members_user
  ON public.external_party_members (user_id);
CREATE INDEX IF NOT EXISTS idx_external_party_members_party
  ON public.external_party_members (party_id);

-- ══════════════════════════════════════════════════════════════════════
-- C) locations — add nullable party FKs (additive, all NULL on day-0)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES public.external_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS broker_id  uuid REFERENCES public.external_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pm_id      uuid REFERENCES public.external_parties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_locations_carrier ON public.locations (carrier_id);
CREATE INDEX IF NOT EXISTS idx_locations_broker  ON public.locations (broker_id);
CREATE INDEX IF NOT EXISTS idx_locations_pm      ON public.locations (pm_id);

-- ══════════════════════════════════════════════════════════════════════
-- D.1) SECURITY DEFINER function — mirrors can_access_location pattern
-- ══════════════════════════════════════════════════════════════════════
--
-- Accepts column values from the row (not a self-query) so it never
-- reads locations from inside a locations policy → no 42P17 recursion.
-- Queries user_profiles and external_party_members (both have RLS),
-- bypassed by SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.can_party_access_location(
  _loc_id  uuid,
  _carrier uuid,
  _broker  uuid,
  _pm      uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    -- (a) Platform admin bypass
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'platform_admin'
    )
    OR
    -- (b) Caller is a member of a party assigned to this location
    EXISTS (
      SELECT 1 FROM external_party_members
      WHERE user_id = auth.uid()
        AND party_id IN (_carrier, _broker, _pm)
    );
$$;

-- ══════════════════════════════════════════════════════════════════════
-- D.2) Additive PERMISSIVE SELECT policy on locations
-- ══════════════════════════════════════════════════════════════════════
--
-- Stacks with "Users can view locations in their organization" (which
-- uses can_access_location). Multiple PERMISSIVE policies combine
-- with OR — if EITHER passes, the row is visible.
--
-- On day-0 carrier_id/broker_id/pm_id are all NULL and
-- external_party_members is empty, so this grants zero access.

DROP POLICY IF EXISTS "Party members can view assigned locations" ON public.locations;
CREATE POLICY "Party members can view assigned locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING ( public.can_party_access_location(id, carrier_id, broker_id, pm_id) );

-- ══════════════════════════════════════════════════════════════════════
-- D.3) RLS on external_parties
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.external_parties ENABLE ROW LEVEL SECURITY;

-- Party members can read their own party row
DROP POLICY IF EXISTS "Party members can view their own party" ON public.external_parties;
CREATE POLICY "Party members can view their own party"
  ON public.external_parties FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT party_id FROM external_party_members
      WHERE user_id = auth.uid()
    )
  );

-- Platform admin: full CRUD
DROP POLICY IF EXISTS "Platform admin can manage external parties" ON public.external_parties;
CREATE POLICY "Platform admin can manage external parties"
  ON public.external_parties FOR ALL
  TO authenticated
  USING  ( public.is_platform_admin() )
  WITH CHECK ( public.is_platform_admin() );

-- ══════════════════════════════════════════════════════════════════════
-- D.4) RLS on external_party_members
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.external_party_members ENABLE ROW LEVEL SECURITY;

-- A user can read their own membership(s)
DROP POLICY IF EXISTS "Users can view their own party memberships" ON public.external_party_members;
CREATE POLICY "Users can view their own party memberships"
  ON public.external_party_members FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() );

-- Platform admin: full CRUD
DROP POLICY IF EXISTS "Platform admin can manage party memberships" ON public.external_party_members;
CREATE POLICY "Platform admin can manage party memberships"
  ON public.external_party_members FOR ALL
  TO authenticated
  USING  ( public.is_platform_admin() )
  WITH CHECK ( public.is_platform_admin() );

-- ══════════════════════════════════════════════════════════════════════
-- Migration tracker
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260916000000')
ON CONFLICT DO NOTHING;
