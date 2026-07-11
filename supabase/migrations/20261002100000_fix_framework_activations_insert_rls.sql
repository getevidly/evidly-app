-- Fix auth.users anti-pattern on framework_activations INSERT policy.
-- The old policy read auth.users.raw_user_meta_data->>'role' which causes
-- 42501 permission-denied for authenticated (non-service-role) users.
-- Rewrite to read user_profiles.role + user_profiles.evidly_staff_role.
--
-- Role-gate reasoning:
--   Old policy checked raw_user_meta_data->>'role' = ANY('admin','owner','platform_admin','super_admin')
--   Mapping to user_profiles:
--     'platform_admin' → user_profiles.role (valid value per CHECK constraint)
--     'admin'          → user_profiles.evidly_staff_role (not a valid role value)
--     'super_admin'    → user_profiles.evidly_staff_role (not a valid role value)
--     'owner'          → legacy value, no longer exists in either column
--   Correct gate: role = 'platform_admin' OR evidly_staff_role IN ('super_admin','admin')
--
-- Applied to PROD irxgmhxhmxtzfwuieblc on 2026-07-10.

DROP POLICY IF EXISTS "Platform admins can insert framework activations"
  ON public.framework_activations;

CREATE POLICY "Platform admins can insert framework activations"
  ON public.framework_activations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (
      user_profiles.role = 'platform_admin'
      OR user_profiles.evidly_staff_role IN ('super_admin', 'admin')
    )
  ));
