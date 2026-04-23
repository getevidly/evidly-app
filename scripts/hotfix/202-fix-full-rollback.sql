-- ============================================================================
-- FIX-2.02-FULL ROLLBACK — Reverse all schema additions
-- Target: irxgmhxhmxtzfwuieblc (evidly-comply-prod)
-- Date: 2026-04-23
--
-- NOTE: Data cleanup (Phase E) is IRREVERSIBLE. This rollback only reverses
-- Phase A schema additions. If Phase E has been executed, orgs and auth users
-- cannot be restored from this script.
-- ============================================================================

BEGIN;

-- Reverse A7: Remove terms_accepted_at from user_profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS terms_accepted_at;

-- Reverse A6: Remove state from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS state;

-- Reverse A5: Remove slug from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS slug;

-- Reverse A4: Remove k12_program_type from locations
ALTER TABLE locations DROP COLUMN IF EXISTS k12_program_type;

-- Reverse A3: Remove k12_program from locations
ALTER TABLE locations DROP COLUMN IF EXISTS k12_program;

-- Reverse A2: Remove sb1383_tier from locations
ALTER TABLE locations DROP COLUMN IF EXISTS sb1383_tier;

-- Reverse A1: Remove kitchen_type from locations
ALTER TABLE locations DROP COLUMN IF EXISTS kitchen_type;

-- Reverse A8: Remove deprecation comments (restore to no comment)
COMMENT ON COLUMN organizations.industry_type IS NULL;
COMMENT ON COLUMN organizations.industry_subtype IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================================
-- TRIGGER RESTORE (only if Phase D was executed)
-- ============================================================================
-- If the trigger was dropped, recreate it here. Copy from:
-- supabase/migrations/20260315000000_auto_profile_on_signup.sql
--
-- CREATE OR REPLACE FUNCTION handle_new_user() ...
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
