/*
  # Per-user mobile nav slot overrides

  Adds mobile_nav_slots to user_preferences so a user can override the three
  middle slots of the mobile bottom nav (src/components/layout/MobileNav.tsx).

  Home and More are pinned by the component and are never stored here.

  Semantics
    NULL            -> use the role default from getRoleSlots(role)
    jsonb array     -> ordered override, 1-3 keys from the allowed set:
                       fire, food, facilities, records, checklists, temps,
                       report, calendar

  Chosen table
    user_preferences, not user_profiles. It is the existing per-user prefs
    table, and its RLS is own-row for all three verbs (auth.uid() = user_id).
    user_profiles.SELECT is org-wide ("Users can view profiles in their
    organization"), which would expose one user's nav layout to colleagues.

  RLS
    No new policy. user_preferences already carries exactly the right ones:
      Users can read own preferences    SELECT  USING  (auth.uid() = user_id)
      Users can insert own preferences  INSERT  CHECK  (auth.uid() = user_id)
      Users can update own preferences  UPDATE  USING/CHECK (auth.uid() = user_id)
    A new column inherits them, so no widening is required.

  DOWN (revert)
    git revert of the commit removes this file but NOT the applied DDL.
    To reverse the schema change on the database, run:

      ALTER TABLE public.user_preferences
        DROP CONSTRAINT IF EXISTS user_preferences_mobile_nav_slots_check;
      ALTER TABLE public.user_preferences
        DROP COLUMN IF EXISTS mobile_nav_slots;

    Dropping the column discards any overrides users have saved; every user
    falls back to the role default, which is the pre-migration behaviour.
*/

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS mobile_nav_slots jsonb;

COMMENT ON COLUMN public.user_preferences.mobile_nav_slots IS
  'Ordered override for the 3 middle mobile-nav slots. NULL = role default. Home and More are pinned and never stored.';

-- Validity is expressed entirely in a CHECK; no subqueries are used, so this
-- is enforced by the database rather than by an app-level guard.
--
--   1. NULL is always allowed (means "role default").
--   2. Must be a JSON array.
--   3. Length 1-3.
--   4. Containment (<@) against the allowed set rejects any unknown key and
--      any non-string element.
--   5. Containment ignores multiplicity, so the pairwise comparisons below
--      close that gap and reject duplicates. They are exhaustive because
--      length is already capped at 3.
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_mobile_nav_slots_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_mobile_nav_slots_check CHECK (
    mobile_nav_slots IS NULL
    OR (
      jsonb_typeof(mobile_nav_slots) = 'array'
      AND jsonb_array_length(mobile_nav_slots) BETWEEN 1 AND 3
      AND mobile_nav_slots <@ '["fire","food","facilities","records","checklists","temps","report","calendar"]'::jsonb
      AND (
        jsonb_array_length(mobile_nav_slots) < 2
        OR mobile_nav_slots ->> 0 <> mobile_nav_slots ->> 1
      )
      AND (
        jsonb_array_length(mobile_nav_slots) < 3
        OR (
          mobile_nav_slots ->> 0 <> mobile_nav_slots ->> 2
          AND mobile_nav_slots ->> 1 <> mobile_nav_slots ->> 2
        )
      )
    )
  );
