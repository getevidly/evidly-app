/*
 * 20260917000000_drift_catches_carrier_read.sql
 *
 * Slice 2.5 — Carrier read access to compliance alerts (drift_catches).
 *
 * Adds ONE additive PERMISSIVE SELECT policy so that authenticated users
 * who are members of a carrier (via external_party_members) can read
 * drift_catches rows for locations assigned to that carrier
 * (locations.carrier_id).
 *
 * SAFETY:
 *   - Existing policies drift_catches_select_org and drift_catches_update_dm
 *     are NOT modified, dropped, or replaced.
 *   - Multiple PERMISSIVE SELECT policies compose with OR — the new policy
 *     grants additional read access without restricting existing access.
 *   - SELECT only — no INSERT/UPDATE/DELETE grant to carriers.
 *   - No WITH CHECK clause (SELECT policies do not use WITH CHECK).
 */

CREATE POLICY drift_catches_select_carrier
  ON public.drift_catches
  FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id
      FROM public.locations l
      WHERE l.carrier_id IN (
        SELECT epm.party_id
        FROM public.external_party_members epm
        WHERE epm.user_id = auth.uid()
      )
    )
  );

-- Migration tracker
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260917000000')
ON CONFLICT DO NOTHING;
