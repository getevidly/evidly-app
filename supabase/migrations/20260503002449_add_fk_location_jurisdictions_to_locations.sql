-- 20260503002449_add_fk_location_jurisdictions_to_locations.sql
--
-- Add missing FK constraint on location_jurisdictions.location_id
-- referencing locations(id). Sprint commit 3d-5b3-fk-patch. Tier 1.
--
-- Discovered when SetupFoodSafetyEntry (3d-5b1) tried to embed
-- location_jurisdictions in a Supabase nested select against
-- locations and PostgREST returned:
--   "Could not find a relationship between 'locations' and
--    'location_jurisdictions' in the schema cache"
--
-- PostgREST infers embeddable relationships from FK metadata.
-- The junction table had only one FK (to jurisdictions) and was
-- missing the symmetric FK back to locations.
--
-- Adds the FK with ON DELETE CASCADE -- junction rows belong to
-- their location and should disappear when the location is removed.
-- Closes a referential integrity gap (orphan junction rows could
-- have existed pointing at deleted locations).
--
-- PROD currently has 0 rows in location_jurisdictions so this
-- migration cannot fail on existing data.
--
-- After PROD apply, hard-refresh required so PostgREST reloads
-- its schema cache; alternatively NOTIFY pgrst, 'reload schema'
-- forces an immediate refresh.

BEGIN;

ALTER TABLE public.location_jurisdictions
  ADD CONSTRAINT location_jurisdictions_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

COMMIT;
