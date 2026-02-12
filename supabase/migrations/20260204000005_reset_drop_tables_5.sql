-- Reset Step 2e: Drop fifth batch of tables
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
  RAISE NOTICE 'Dropped % tables (batch 5)', i;
END $$;
