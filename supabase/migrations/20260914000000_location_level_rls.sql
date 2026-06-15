/*
 * 20260914000000_location_level_rls.sql
 *
 * Enforce per-user location-level scoping on the locations table.
 *
 * BEFORE: The SELECT policy on locations checks only that the user belongs
 *         to the org via user_location_access — every user in the org sees
 *         every location.
 *
 * AFTER:  A SECURITY DEFINER function can_access_location() checks:
 *         1. Platform admin → sees all locations (bypass)
 *         2. ULA row with location_id IS NULL → org-wide, sees all locations in org
 *         3. ULA row with location_id = the location → sees only that location
 *
 * CRITICAL SAFETY NOTE: Every real user today has an org-wide ULA row
 * (location_id IS NULL). This migration does NOT lock anyone out because
 * NULL-location_id is explicitly handled as "see all locations in that org."
 *
 * INSERT / UPDATE / DELETE policies are LEFT UNCHANGED — they still use
 * the original org-level check.
 *
 * Region scoping (ULA.region_id) is out of scope — deferred until the
 * regions table is populated and location→region mapping exists.
 */

-- ── 1. SECURITY DEFINER function ────────────────────────────────────
--    Bypasses RLS on user_profiles and user_location_access to avoid
--    42P17 infinite recursion when called from an RLS policy.
--
--    Logic:
--      a) platform_admin → true (short-circuit)
--      b) ULA row exists where organization_id matches AND
--         (location_id IS NULL  — org-wide access
--          OR location_id = the location being checked)

CREATE OR REPLACE FUNCTION public.can_access_location(_loc_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    -- (a) Platform admin bypasses all location scoping
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'platform_admin'
    )
    OR
    -- (b) User has a ULA row for this org that covers this location
    EXISTS (
      SELECT 1 FROM user_location_access
      WHERE user_id  = auth.uid()
        AND organization_id = _org_id
        AND (location_id IS NULL OR location_id = _loc_id)
    );
$$;

-- ── 2. Replace SELECT policy on locations ───────────────────────────
--    Old: USING (organization_id IN (SELECT organization_id FROM
--           user_location_access WHERE user_id = auth.uid()))
--    New: USING (public.can_access_location(id, organization_id))

DROP POLICY IF EXISTS "Users can view locations in their organization" ON locations;

CREATE POLICY "Users can view locations in their organization"
  ON locations FOR SELECT
  USING ( public.can_access_location(id, organization_id) );

-- ── 3. INSERT / UPDATE / DELETE — no changes ────────────────────────
--    These remain org-level:
--      "Users can insert locations in their organization"  (INSERT)
--      "Users can update locations in their organization"  (UPDATE)
--      "Users can delete locations in their organization"  (DELETE)
--      "platform_admin_insert_locations"                   (INSERT)
--    All left as-is.

-- ── 4. Migration tracker ────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260914000000')
ON CONFLICT DO NOTHING;
