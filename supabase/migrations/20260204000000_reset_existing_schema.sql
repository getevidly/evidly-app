/*
  # Reset Step 1: Drop all foreign key constraints
  Once FKs are gone, tables can be dropped individually without cascading locks.
*/
DO $$ DECLARE
  r RECORD;
  i INT := 0;
BEGIN
  FOR r IN (
    SELECT con.conname, cl.relname AS tablename
    FROM pg_constraint con
    JOIN pg_class cl ON con.conrelid = cl.oid
    JOIN pg_namespace ns ON cl.relnamespace = ns.oid
    WHERE ns.nspname = 'public' AND con.contype = 'f'
    ORDER BY cl.relname
  ) LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    i := i + 1;
  END LOOP;
  RAISE NOTICE 'Dropped % foreign key constraints', i;
END $$;
