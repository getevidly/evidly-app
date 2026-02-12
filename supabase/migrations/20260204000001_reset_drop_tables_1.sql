-- Reset Step 2a: Drop all views first, then drop first batch of tables

-- Drop all views (they block table drops)
DO $$ DECLARE
  r RECORD;
  i INT := 0;
BEGIN
  FOR r IN (
    SELECT viewname FROM pg_views WHERE schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
    i := i + 1;
  END LOOP;
  RAISE NOTICE 'Dropped % views', i;
END $$;

-- Drop materialized views
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
  END LOOP;
END $$;

-- Now drop first batch of tables (no FKs, no views = safe)
DO $$ DECLARE
  r RECORD;
  i INT := 0;
BEGIN
  FOR r IN (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 40
  ) LOOP
    BEGIN
      EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename);
      i := i + 1;
    EXCEPTION WHEN dependent_objects_still_exist THEN
      EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      i := i + 1;
    END;
  END LOOP;
  RAISE NOTICE 'Dropped % tables (batch 1)', i;
END $$;
