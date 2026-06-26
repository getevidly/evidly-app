-- 20260626000000_pl_runs_findings_admin_rls
-- Persist RLS policies applied live via SQL editor for repo parity.
-- pl_extraction_runs: admin SELECT + UPDATE, service_role ALL
-- pl_findings: admin SELECT, service_role ALL
-- Idempotent: DROP IF EXISTS then CREATE.

-- ── Enable RLS (idempotent) ─────────────────────────────────────
ALTER TABLE public.pl_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_findings ENABLE ROW LEVEL SECURITY;

-- ── pl_extraction_runs ──────────────────────────────────────────

DROP POLICY IF EXISTS plr_admin_select ON public.pl_extraction_runs;
CREATE POLICY plr_admin_select ON public.pl_extraction_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS plr_admin_update ON public.pl_extraction_runs;
CREATE POLICY plr_admin_update ON public.pl_extraction_runs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS plr_service_role ON public.pl_extraction_runs;
CREATE POLICY plr_service_role ON public.pl_extraction_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ── pl_findings ─────────────────────────────────────────────────

DROP POLICY IF EXISTS plf_admin_select ON public.pl_findings;
CREATE POLICY plf_admin_select ON public.pl_findings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS plf_service_role ON public.pl_findings;
CREATE POLICY plf_service_role ON public.pl_findings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Record migration ────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260626000000', 'pl_runs_findings_admin_rls')
ON CONFLICT DO NOTHING;
