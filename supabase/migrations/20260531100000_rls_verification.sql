-- SECURITY-FIX-02 M7: RLS verification
-- Ensures all public tables have RLS enabled.
-- Tables created by migrations should already have RLS, but this catches any gaps.
-- Run the SELECT queries below in Supabase SQL Editor to verify:
--
-- Tables with RLS disabled:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false ORDER BY tablename;
--
-- Tables with RLS enabled but zero policies:
-- SELECT t.tablename FROM pg_tables t
-- LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
-- WHERE t.schemaname = 'public' GROUP BY t.tablename HAVING COUNT(p.policyname) = 0 ORDER BY t.tablename;

-- Enable RLS on all public tables that don't have it yet
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'Enabled RLS on: %', tbl.tablename;
  END LOOP;
END $$;

-- For tables with RLS enabled but no policies, add a restrictive service_role-only default
-- This prevents accidental data exposure while allowing edge functions (service_role) to work
DO $$
DECLARE
  tbl RECORD;
  policy_exists BOOLEAN;
BEGIN
  FOR tbl IN
    SELECT t.tablename
    FROM pg_tables t
    LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename
    HAVING COUNT(p.policyname) = 0
  LOOP
    -- Double-check no policy exists (race condition guard)
    SELECT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl.tablename AND schemaname = 'public'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL USING (auth.role() = ''service_role'')',
        tbl.tablename || '_service_only',
        tbl.tablename
      );
      RAISE NOTICE 'Added service_role-only policy on: %', tbl.tablename;
    END IF;
  END LOOP;
END $$;
