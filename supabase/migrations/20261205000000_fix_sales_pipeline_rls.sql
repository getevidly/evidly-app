-- Fix sales_pipeline RLS: replace broken sp_sales_rw policy.
--
-- The old policy checked auth.jwt() ->> 'user_role', a JWT claim that was
-- never injected (no custom_access_token hook exists). Result: every
-- authenticated browser query returned zero rows.
--
-- The new policy reads the app's real role source: user_profiles.evidly_staff_role,
-- via a SECURITY DEFINER helper so RLS cannot block the lookup itself.

-- (a) Helper: resolve the current user's evidly staff role from user_profiles.
CREATE OR REPLACE FUNCTION public.current_evidly_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT evidly_staff_role
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1
$$;
-- (b) Replace the broken policy.
DROP POLICY IF EXISTS sp_sales_rw ON sales_pipeline;
CREATE POLICY sp_staff_rw ON sales_pipeline FOR ALL
  USING  (public.current_evidly_staff_role() IN ('super_admin', 'sales'))
  WITH CHECK (public.current_evidly_staff_role() IN ('super_admin', 'sales'))