-- ============================================================
-- POLICY LENS INTAKE LANDING TABLE — Schema v1.0 LOCK
-- Migration: 20260910000000
-- PL-01: Version-locked contract for the Policy Lens build.
-- Track A writes here (intake/extraction/report/provisioning);
-- continuous review reads from here later.
-- Append-only in spirit: rows never deleted,
-- extracted_fields immutable once status=verified.
-- ============================================================

CREATE TABLE public.policy_lens_intakes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  schema_version        text NOT NULL DEFAULT '1.0',

  -- door + pipeline state
  source                text NOT NULL CHECK (source IN ('prospect','agent')),
  status                text NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received','extracting','review',
                        'verified','report_sent','failed')),

  -- prospect / account stub
  business_name         text NOT NULL,
  contact_name          text,
  contact_email         text NOT NULL,
  contact_phone         text,
  email_verified_at     timestamptz,
  zip                   text,
  county                text,
  organization_id       uuid REFERENCES public.organizations(id),

  -- agent + attribution
  agent_name            text,
  agent_email           text,
  agent_report_consent  boolean NOT NULL DEFAULT false,
  agent_consent_at      timestamptz,
  attribution_source    text,

  -- policy document
  policy_pdf_path       text,
  carrier               text,
  policy_type           text,

  -- verified extraction (written once at verification)
  matrix_version        text,
  extracted_fields      jsonb,
  overall_confidence    numeric,
  review_required       boolean NOT NULL DEFAULT false,
  reviewed_at           timestamptz,

  -- report routing
  report_sent_to_prospect_at  timestamptz,
  report_sent_to_agent_at     timestamptz
);

-- Indexes
CREATE INDEX idx_pli_contact_email ON public.policy_lens_intakes (contact_email);
CREATE INDEX idx_pli_status ON public.policy_lens_intakes (status);
CREATE INDEX idx_pli_organization_id ON public.policy_lens_intakes (organization_id);
CREATE INDEX idx_pli_created_at ON public.policy_lens_intakes (created_at DESC);

-- RLS
ALTER TABLE public.policy_lens_intakes ENABLE ROW LEVEL SECURITY;

-- Service-role full access (edge functions write here)
DROP POLICY IF EXISTS pli_service_role ON public.policy_lens_intakes;
CREATE POLICY pli_service_role ON public.policy_lens_intakes
  FOR ALL USING (auth.role() = 'service_role');

-- Platform admin read-all (mirrors testimonials admin-read pattern)
DROP POLICY IF EXISTS pli_admin_select ON public.policy_lens_intakes;
CREATE POLICY pli_admin_select ON public.policy_lens_intakes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'platform_admin'
    )
  );

COMMENT ON TABLE public.policy_lens_intakes IS
  'Policy Lens intake landing zone. Schema v1.0 LOCKED. Column changes require a versioned migration + explicit approval. Rows are never deleted; extracted_fields immutable once status=verified.';

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260910000000')
ON CONFLICT DO NOTHING;
