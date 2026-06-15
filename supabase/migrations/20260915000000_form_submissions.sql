-- ============================================================
-- FORM SUBMISSIONS — landing-site form intake table
-- Migration: 20260915000000
-- Captures all landing-site form submissions (founding_member,
-- alerts, feedback, partner, cta, resource) with auto-reply
-- handled by the form-submit edge function.
-- ============================================================

CREATE TABLE public.form_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  form_type       text NOT NULL
                  CHECK (form_type IN ('founding_member','alerts','feedback','partner','cta','resource')),
  name            text,
  business_name   text,
  email           text NOT NULL,
  phone           text,
  state           text,
  jurisdiction    text,
  message         text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  consent         boolean NOT NULL DEFAULT false,
  source_page     text
);

-- Indexes
CREATE INDEX idx_fs_email ON public.form_submissions (email);
CREATE INDEX idx_fs_form_type ON public.form_submissions (form_type);
CREATE INDEX idx_fs_created_at ON public.form_submissions (created_at DESC);

-- RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Service-role full access (edge functions write here)
DROP POLICY IF EXISTS fs_service_role ON public.form_submissions;
CREATE POLICY fs_service_role ON public.form_submissions
  FOR ALL USING (auth.role() = 'service_role');

-- Platform admin read-all
DROP POLICY IF EXISTS fs_admin_select ON public.form_submissions;
CREATE POLICY fs_admin_select ON public.form_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'platform_admin'
    )
  );

COMMENT ON TABLE public.form_submissions IS
  'Landing-site form submissions. All form types funnel here; auto-reply emails sent by the form-submit edge function. metadata jsonb captures per-form extra fields.';

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260915000000')
ON CONFLICT DO NOTHING;
