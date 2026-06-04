/*
 * get_signals_for_org — county-overlap signal matching RPC
 *
 * Returns published intelligence_signals relevant to the given org:
 *   1. Org counties derived via locations.jurisdiction_id → jurisdictions.county
 *      (settled model — NOT the legacy location_jurisdictions join table).
 *   2. Signal matches if target_counties OR counties_affected overlaps org counties.
 *   3. Signals with both arrays null/empty are global — visible to all orgs.
 *   4. Orgs with no jurisdiction-bound locations see only global signals.
 *
 * Returns SETOF intelligence_signals so PostgREST callers can chain
 * .select(), .eq(), .in(), .order(), .limit() on the result.
 *
 * SECURITY DEFINER: reads locations (RLS may restrict to caller's org),
 * jurisdictions (public ref data), and intelligence_signals (published only).
 * No org-private data is exposed — signals are public content.
 */

CREATE OR REPLACE FUNCTION public.get_signals_for_org(p_org_id uuid)
RETURNS SETOF public.intelligence_signals
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH org_counties AS (
    SELECT DISTINCT j.county
    FROM locations l
    JOIN jurisdictions j ON j.id = l.jurisdiction_id
    WHERE l.organization_id = p_org_id
      AND l.jurisdiction_id IS NOT NULL
      AND j.county IS NOT NULL
  )
  SELECT s.*
  FROM intelligence_signals s
  WHERE s.is_published = true
    AND (
      -- target_counties overlap (admin targeting via submitAdvisory)
      (s.target_counties IS NOT NULL
       AND array_length(s.target_counties, 1) > 0
       AND EXISTS (
         SELECT 1 FROM org_counties oc
         WHERE oc.county = ANY(s.target_counties)
       ))
      OR
      -- counties_affected overlap (collector via intelligence-collect)
      (s.counties_affected IS NOT NULL
       AND array_length(s.counties_affected, 1) > 0
       AND EXISTS (
         SELECT 1 FROM org_counties oc
         WHERE oc.county = ANY(s.counties_affected)
       ))
      OR
      -- Untargeted / global: both arrays null or empty
      ((s.target_counties IS NULL OR array_length(s.target_counties, 1) IS NULL)
       AND (s.counties_affected IS NULL OR array_length(s.counties_affected, 1) IS NULL))
    )
$$;

COMMENT ON FUNCTION public.get_signals_for_org(uuid) IS
  'Returns published signals matching the org''s location counties, plus global signals.';

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260604000001')
ON CONFLICT DO NOTHING;
