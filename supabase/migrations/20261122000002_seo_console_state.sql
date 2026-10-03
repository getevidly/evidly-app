CREATE TABLE IF NOT EXISTS public.seo_console_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_console_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seo_console_state' AND policyname = 'admin_only'
  ) THEN
    CREATE POLICY admin_only ON public.seo_console_state FOR ALL TO authenticated
      USING ((auth.jwt() ->> 'email') LIKE '%@getevidly.com')
      WITH CHECK ((auth.jwt() ->> 'email') LIKE '%@getevidly.com');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seo_console_state' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.seo_console_state FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

REVOKE ALL ON public.seo_console_state FROM anon, PUBLIC;

-- Rollback: DROP TABLE IF EXISTS public.seo_console_state;
