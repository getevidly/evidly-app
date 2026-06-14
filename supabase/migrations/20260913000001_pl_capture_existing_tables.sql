-- ============================================================
-- DOCUMENTATION MIGRATION: Capture 6 existing PL tables
-- Migration: 20260913000001
-- These tables exist in PROD but were never version-controlled.
-- Every statement uses IF NOT EXISTS / DO-guard so this is a
-- NO-OP against PROD and safe to apply to a fresh DB.
--
-- FK dependency order:
--   1. pl_standards_registry   (no PL FKs)
--   2. pl_finding_templates    (no PL FKs)
--   3. pl_documents            (FK → policy_lens_intakes)
--   4. pl_extraction_runs      (FK → policy_lens_intakes, pl_documents)
--   5. pl_findings             (FK → pl_extraction_runs, policy_lens_intakes)
--   6. pl_report_grants        (FK → policy_lens_intakes, pl_extraction_runs)
--
-- External dependency: is_platform_admin() — used in 3 RLS
-- policies. Guarded: if the function does not exist in pg_proc,
-- those policies are skipped with a NOTICE rather than failing.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. pl_standards_registry  (11 columns)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pl_standards_registry (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic           text        NOT NULL UNIQUE,
  standard        text        NOT NULL,
  edition         text        NOT NULL,
  citation        text        NOT NULL,
  enforced_by     text        NOT NULL DEFAULT 'California Fire Code',
  chapter         text,
  requirement     jsonb       NOT NULL DEFAULT '{}',
  pending_fields  text[]      NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  citation_detail text
);

ALTER TABLE public.pl_standards_registry ENABLE ROW LEVEL SECURITY;
-- No RLS policies — service_role bypass only.


-- ────────────────────────────────────────────────────────────
-- 2. pl_finding_templates  (15 columns)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pl_finding_templates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id         text        NOT NULL UNIQUE,
  finding_key       text        NOT NULL,
  part              text        NOT NULL CHECK (part IN ('fire','food','general')),
  default_flag      text        NOT NULL CHECK (default_flag IN ('high','elevated','satisfied','low')),
  trigger_condition text,
  agent_title       text        NOT NULL,
  agent_body        text        NOT NULL,
  agent_refs        text,
  kitchen_title     text        NOT NULL,
  kitchen_body      text        NOT NULL,
  correlation       jsonb,
  citation_verified text,
  severity          text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pl_finding_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pl_finding_templates' AND policyname = 'pl_ft_service'
  ) THEN
    CREATE POLICY pl_ft_service ON public.pl_finding_templates
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- is_platform_admin() guard: skip policy if function absent
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'is_platform_admin' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'is_platform_admin() not found — skipping pl_ft_admin_all policy';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pl_finding_templates' AND policyname = 'pl_ft_admin_all'
  ) THEN
    CREATE POLICY pl_ft_admin_all ON public.pl_finding_templates
      FOR ALL USING (is_platform_admin());
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. pl_documents  (19 columns)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pl_documents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id           uuid        NOT NULL REFERENCES public.policy_lens_intakes(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  doc_type            text        NOT NULL
                      CHECK (doc_type IN ('hood_cleaning','suppression','fire_sprinkler',
                             'fire_alarm','grease_trap','backflow','pest_control',
                             'servsafe','food_safety_other','other')),
  file_path           text        NOT NULL,
  original_filename   text,
  mime_type           text,
  file_size_bytes     bigint,
  status              text        NOT NULL DEFAULT 'uploaded'
                      CHECK (status IN ('uploaded','reading','classified','verified','failed')),
  evidence_tier       text
                      CHECK (evidence_tier IS NULL OR evidence_tier IN
                             ('t0_self_attested','t1_on_file','t2_verified',
                              't3_inspected','t4_evidly_maintained')),
  provider_name       text,
  provider_license    text,
  license_verified_at timestamptz,
  service_date        date,
  interval_status     text
                      CHECK (interval_status IS NULL OR interval_status IN
                             ('within','overdue','unknown')),
  pencil_whip_flag    boolean     NOT NULL DEFAULT false,
  extraction          jsonb,
  review_required     boolean     NOT NULL DEFAULT true,
  reviewed_at         timestamptz
);

CREATE INDEX IF NOT EXISTS pl_documents_intake_id_idx
  ON public.pl_documents (intake_id);
CREATE INDEX IF NOT EXISTS pl_documents_intake_type_idx
  ON public.pl_documents (intake_id, doc_type);

ALTER TABLE public.pl_documents ENABLE ROW LEVEL SECURITY;

-- is_platform_admin() guard: skip policy if function absent
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'is_platform_admin' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'is_platform_admin() not found — skipping pl_documents_admin_all policy';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pl_documents' AND policyname = 'pl_documents_admin_all'
  ) THEN
    CREATE POLICY pl_documents_admin_all ON public.pl_documents
      FOR ALL TO authenticated
      USING (is_platform_admin())
      WITH CHECK (is_platform_admin());
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 4. pl_extraction_runs  (21 columns)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pl_extraction_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id       uuid        NOT NULL REFERENCES public.policy_lens_intakes(id),
  document_id     uuid        REFERENCES public.pl_documents(id),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','passes_complete','reconciled','failed')),
  model_a         text,
  model_b         text,
  pass_a          jsonb,
  pass_b          jsonb,
  reconciled      jsonb,
  integrity_flags jsonb       DEFAULT '[]'::jsonb,
  review_required boolean     NOT NULL DEFAULT true,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  reconciled_at   timestamptz,
  coverage        jsonb,
  report_complete boolean,
  release_status  text        NOT NULL DEFAULT 'draft'
                              CHECK (release_status IN ('draft','in_review','released','revoked')),
  released_at     timestamptz,
  released_by     text,
  release_note    text,
  citation_drift  jsonb       NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pl_runs_intake
  ON public.pl_extraction_runs (intake_id);

ALTER TABLE public.pl_extraction_runs ENABLE ROW LEVEL SECURITY;
-- No RLS policies — service_role bypass only.


-- ────────────────────────────────────────────────────────────
-- 5. pl_findings  (13 columns)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pl_findings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid        NOT NULL REFERENCES public.pl_extraction_runs(id),
  intake_id       uuid        NOT NULL REFERENCES public.policy_lens_intakes(id),
  finding_key     text        NOT NULL,
  part            text        NOT NULL CHECK (part IN ('fire','food','general')),
  flag            text        NOT NULL CHECK (flag IN ('high','elevated','satisfied','low')),
  agent_payload   jsonb       NOT NULL,
  kitchen_payload jsonb       NOT NULL,
  correlation     jsonb       NOT NULL,
  source_refs     jsonb       DEFAULT '[]'::jsonb,
  citation_status text        NOT NULL DEFAULT 'pending'
                              CHECK (citation_status IN ('pending','verified')),
  review_required boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pl_findings_run
  ON public.pl_findings (run_id);

ALTER TABLE public.pl_findings ENABLE ROW LEVEL SECURITY;
-- No RLS policies — service_role bypass only.


-- ────────────────────────────────────────────────────────────
-- 6. pl_report_grants  (10 columns)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pl_report_grants (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id        uuid        NOT NULL REFERENCES public.policy_lens_intakes(id),
  run_id           uuid        NOT NULL REFERENCES public.pl_extraction_runs(id),
  token_hash       text        NOT NULL UNIQUE,
  door             text        NOT NULL CHECK (door IN ('company','agent')),
  expires_at       timestamptz NOT NULL,
  revoked_at       timestamptz,
  last_accessed_at timestamptz,
  access_count     integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pl_report_grants_intake
  ON public.pl_report_grants (intake_id);
CREATE INDEX IF NOT EXISTS idx_pl_report_grants_run
  ON public.pl_report_grants (run_id);
-- Redundant with UNIQUE constraint index — reproduced as-is from PROD.
CREATE INDEX IF NOT EXISTS idx_pl_report_grants_token
  ON public.pl_report_grants (token_hash);

ALTER TABLE public.pl_report_grants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pl_report_grants' AND policyname = 'pl_report_grants_service'
  ) THEN
    CREATE POLICY pl_report_grants_service ON public.pl_report_grants
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- is_platform_admin() guard: skip policy if function absent
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'is_platform_admin' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'is_platform_admin() not found — skipping pl_report_grants_admin policy';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pl_report_grants' AND policyname = 'pl_report_grants_admin'
  ) THEN
    CREATE POLICY pl_report_grants_admin ON public.pl_report_grants
      FOR SELECT USING (is_platform_admin());
  END IF;
END $$;


-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260913000001')
ON CONFLICT DO NOTHING;
