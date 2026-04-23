-- ============================================================================
-- FIX-2.02-FULL FORWARD — Org / Location / Kitchen Type Reconciliation
-- Target: irxgmhxhmxtzfwuieblc (evidly-comply-prod)
-- Date: 2026-04-23
-- Author: Claude Code (Phase 2 draft, awaiting Stop Gate B approval)
--
-- PHASE A: Schema additions (safe, additive — run first)
-- PHASE D: Trigger removal (run ONLY after code deploy verified)
-- PHASE E: Data cleanup (run ONLY after trigger removal verified)
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE A — Schema Additions (safe, additive)                            │
-- └──────────────────────────────────────────────────────────────────────────┘

BEGIN;

-- A1: Add kitchen_type to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS kitchen_type text;
COMMENT ON COLUMN locations.kitchen_type IS 'Canonical kitchen type from 14-value list. Values: restaurant, hotel_resort, healthcare_facility, senior_living, k12_school, higher_education, corporate_cafeteria, food_truck, catering, ghost_kitchen, bar_nightclub, convention_center, sports_venue, casino.';

-- A2: Add SB 1383 tier to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS sb1383_tier text;
COMMENT ON COLUMN locations.sb1383_tier IS 'CA Edible Food Recovery tier. Values: tier_1, tier_2, not_subject, null=unknown. CHECK constraint deferred until compliance setup wizard ticket.';

-- A3: Add K-12 program flag to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS k12_program boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN locations.k12_program IS 'True if kitchen is part of a K-12 school feeding program. Triggers K-12 compliance gates.';

-- A4: Add K-12 program type to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS k12_program_type text;
COMMENT ON COLUMN locations.k12_program_type IS 'K-12 program classification. Values TBD pending SB 476 / Ed Code review. CHECK constraint deferred.';

-- A5: Add slug to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug text UNIQUE;
COMMENT ON COLUMN organizations.slug IS 'URL-safe unique identifier. Format: lowercase-name-6alphanum. Generated at signup.';

-- A6: Add state to organizations (with CHECK constraint for 2-char US state codes)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state text
  CHECK (state IN ('AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'));
COMMENT ON COLUMN organizations.state IS 'US state 2-char code. Collected at signup.';

-- A7: Add terms_accepted_at to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
COMMENT ON COLUMN user_profiles.terms_accepted_at IS 'Timestamp when user accepted Terms of Service and Privacy Policy during signup.';

-- A8: Deprecate old columns (leave in place, add comments)
COMMENT ON COLUMN organizations.industry_type IS 'DEPRECATED — use locations.kitchen_type. Do not write to this column.';
COMMENT ON COLUMN organizations.industry_subtype IS 'DEPRECATED — use locations.kitchen_type. Do not write to this column.';

-- A9: Backfill slug for EvidLY org
UPDATE organizations
SET slug = 'evidly-' || substr(md5(random()::text), 1, 6)
WHERE id = '3df66b3b-b90b-4b1b-acb4-2223e0434f0b'
  AND slug IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE D — Trigger Removal                                              │
-- │ RUN ONLY AFTER: code deployed + test signup verified (Phase C)         │
-- └──────────────────────────────────────────────────────────────────────────┘
-- Uncomment and run manually after Phase C verification passes.

-- BEGIN;
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS handle_new_user();
-- COMMIT;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE E — Data Cleanup                                                 │
-- │ RUN ONLY AFTER: trigger removal verified (Phase D)                     │
-- │ STOP GATE B: Print verification queries BEFORE running deletes.        │
-- └──────────────────────────────────────────────────────────────────────────┘
-- Uncomment and run manually after Phase D verification passes.

-- -- E1: Verify 5 org UUIDs scheduled for deletion
-- SELECT id, name FROM organizations
-- WHERE id IN (
--   '96055658-4382-437a-91d4-87b309a592f4',  -- getevidly.com
--   '2d5558fa-ff03-47c6-910d-e46ccb56213d',  -- aol.com
--   '36f4c1a1-abf1-4479-9067-56b8ac0a5cd8',  -- gmail.com
--   '7ee9deff-2ed3-453b-be51-265c900e3786',  -- yahoo.com
--   '097f93ce-6d47-416d-90e8-1c5b8f22cd69'   -- Merced Kitchen
-- );

-- -- E2: Verify Arthur is NOT linked to any of those orgs
-- SELECT up.id, up.full_name, up.organization_id, o.name AS org_name
-- FROM user_profiles up
-- JOIN organizations o ON o.id = up.organization_id
-- WHERE up.id = 'bc95479e-5f7f-4c8b-a10c-4901d342d007';
-- -- MUST show organization_id = 3df66b3b (EvidLY, KEPT). If not, STOP.

-- -- E3: Delete NO ACTION FK children (inspection_reports)
-- BEGIN;
-- DELETE FROM inspection_reports
-- WHERE organization_id = '96055658-4382-437a-91d4-87b309a592f4';
-- -- Expected: 7 rows deleted

-- -- E4: Delete 5 junk orgs (CASCADE handles all other FK children)
-- DELETE FROM organizations
-- WHERE id IN (
--   '96055658-4382-437a-91d4-87b309a592f4',
--   '2d5558fa-ff03-47c6-910d-e46ccb56213d',
--   '36f4c1a1-abf1-4479-9067-56b8ac0a5cd8',
--   '7ee9deff-2ed3-453b-be51-265c900e3786',
--   '097f93ce-6d47-416d-90e8-1c5b8f22cd69'
-- );
-- -- Expected: 5 rows deleted

-- -- E5: Verify only 1 org remains
-- SELECT count(*) AS org_count FROM organizations;
-- -- MUST be 1

-- COMMIT;

-- -- E6: Delete 5 auth users (run via Supabase dashboard or admin API)
-- -- patty_haggerty@aol.com     → 7dcfa323-7dd7-4dac-a34e-ce5f4d96916a
-- -- alhagg67@gmail.com         → 4ea4e7b8-3874-43d6-b18c-be165aa0cfdc
-- -- ahagg@yahoo.com            → 38c8409d-8113-46d9-9b56-e5c46cf4b08b
-- -- e2e-operator@getevidly.com → 8cc4c953-a80c-48b9-b063-5b785df4385e
-- -- e2e-kitchen@getevidly.com  → 1db9eec6-9a5b-438a-9456-8f09faf761ee
