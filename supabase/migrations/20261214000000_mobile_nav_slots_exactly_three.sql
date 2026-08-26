/*
  # Tighten mobile_nav_slots to exactly 3 keys

  20261213000000 allowed an override of 1-3 keys. An override is meant to
  replace ALL THREE middle slots of the mobile bottom nav, so a 1- or 2-key
  value would leave the bar mixing custom and role-default slots. This
  narrows the length rule to exactly 3.

  Everything else is unchanged: NULL still means "use the role default",
  the allowed key set is the same, and duplicates are still rejected.

  Safety
    Checked before altering: user_preferences held 1 row, 0 with a non-null
    mobile_nav_slots, and 0 that would violate length = 3. No row needed
    fixing and no data is dropped.

  DOWN (revert)
    git revert of the commit removes this file but NOT the applied DDL.
    Reverting the constraint needs a NEW migration that restores the 1-3
    form, because the old constraint is replaced in place:

      ALTER TABLE public.user_preferences
        DROP CONSTRAINT IF EXISTS user_preferences_mobile_nav_slots_check;
      ALTER TABLE public.user_preferences
        ADD CONSTRAINT user_preferences_mobile_nav_slots_check CHECK (
          mobile_nav_slots IS NULL
          OR (
            jsonb_typeof(mobile_nav_slots) = 'array'
            AND jsonb_array_length(mobile_nav_slots) BETWEEN 1 AND 3
            AND mobile_nav_slots <@ '["fire","food","facilities","records","checklists","temps","report","calendar"]'::jsonb
            AND (jsonb_array_length(mobile_nav_slots) < 2
                 OR mobile_nav_slots ->> 0 <> mobile_nav_slots ->> 1)
            AND (jsonb_array_length(mobile_nav_slots) < 3
                 OR (mobile_nav_slots ->> 0 <> mobile_nav_slots ->> 2
                     AND mobile_nav_slots ->> 1 <> mobile_nav_slots ->> 2))
          )
        );

    Widening back is always safe: every value valid under length = 3 is
    also valid under 1-3.
*/

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_mobile_nav_slots_check;

-- Length is now fixed at 3, so the duplicate check is a single exhaustive
-- triple comparison rather than the length-guarded pairs it replaced.
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_mobile_nav_slots_check CHECK (
    mobile_nav_slots IS NULL
    OR (
      jsonb_typeof(mobile_nav_slots) = 'array'
      AND jsonb_array_length(mobile_nav_slots) = 3
      AND mobile_nav_slots <@ '["fire","food","facilities","records","checklists","temps","report","calendar"]'::jsonb
      AND mobile_nav_slots ->> 0 <> mobile_nav_slots ->> 1
      AND mobile_nav_slots ->> 0 <> mobile_nav_slots ->> 2
      AND mobile_nav_slots ->> 1 <> mobile_nav_slots ->> 2
    )
  );

COMMENT ON COLUMN public.user_preferences.mobile_nav_slots IS
  'Ordered override for the 3 middle mobile-nav slots — exactly 3 distinct keys, or NULL for the role default. Home and More are pinned and never stored.';
