-- ============================================================
-- POLICY LENS INTAKE BACKEND — Schema v1.2
-- Migration: 20260912000000
-- PL-02A: contact_email conditional by source, OTP codes table,
-- policy-lens-uploads storage bucket.
-- ============================================================

-- ── 1. contact_email: conditional NOT NULL ──────────────────
ALTER TABLE public.policy_lens_intakes
  ALTER COLUMN contact_email DROP NOT NULL;

ALTER TABLE public.policy_lens_intakes
  ADD CONSTRAINT pli_contact_email_by_source
  CHECK (source <> 'prospect' OR contact_email IS NOT NULL);

-- ── 2. Bump schema version default ─────────────────────────
ALTER TABLE public.policy_lens_intakes
  ALTER COLUMN schema_version SET DEFAULT '1.2';

-- ── 3. Update table comment ────────────────────────────────
COMMENT ON TABLE public.policy_lens_intakes IS
  'Policy Lens intake landing zone. Schema v1.2 LOCKED. v1.2: contact_email required for prospect rows, optional for agent rows (agent controls the reveal). Column changes require a versioned migration + explicit approval. Rows are never deleted; extracted_fields immutable once status=verified.';

-- ── 4. OTP codes (ephemeral auth — NOT part of locked contract) ──
CREATE TABLE public.policy_lens_otp_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id   uuid NOT NULL REFERENCES public.policy_lens_intakes(id),
  channel     text NOT NULL CHECK (channel IN ('sms','email')),
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plo_intake_created
  ON public.policy_lens_otp_codes (intake_id, created_at DESC);

ALTER TABLE public.policy_lens_otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plo_service_role ON public.policy_lens_otp_codes;
CREATE POLICY plo_service_role ON public.policy_lens_otp_codes
  FOR ALL USING (auth.role() = 'service_role');

-- ── 5. Storage bucket: policy-lens-uploads ─────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'policy-lens-uploads',
  'policy-lens-uploads',
  false,
  26214400,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: service-role only (intakes pre-date orgs)
DROP POLICY IF EXISTS plu_service_role ON storage.objects;
CREATE POLICY plu_service_role ON storage.objects
  FOR ALL USING (bucket_id = 'policy-lens-uploads' AND auth.role() = 'service_role');

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260912000000')
ON CONFLICT DO NOTHING;
