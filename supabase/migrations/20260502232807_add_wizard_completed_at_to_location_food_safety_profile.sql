-- 20260502232807_add_wizard_completed_at_to_location_food_safety_profile.sql
--
-- Add wizard_completed_at timestamp to location_food_safety_profile.
-- Sprint commit 3d-5b-schema. Tier 1, additive only.
--
-- Drives picker status badges in SetupFoodSafetyEntry (3d-5b1):
--   NULL profile row    → "Not started"
--   row + NULL timestamp → "In progress"
--   row + timestamp set  → "Set up"
--
-- Set by the wizard on Q7 review-and-apply submission (3d-X
-- persistence layer). Re-running the wizard later overwrites
-- with the new completion timestamp; "Set up" status is sticky
-- but resettable.
--
-- Index added because picker queries will filter on this column
-- when sorting status-first (Not started → In progress → Set up).

BEGIN;

ALTER TABLE public.location_food_safety_profile
  ADD COLUMN wizard_completed_at timestamptz;

CREATE INDEX idx_lfsp_wizard_completed_at
  ON public.location_food_safety_profile(wizard_completed_at);

COMMENT ON COLUMN public.location_food_safety_profile.wizard_completed_at IS
  'Timestamp when the food safety wizard was finalized via Q7 review-and-apply. NULL means the profile is in progress (some answers saved) or not started (no row yet — the row only exists after Q1 first save). Set by the wizard reducer (3d-6) on final submission.';

COMMIT;
