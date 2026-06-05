-- ============================================================
-- POLICY LENS — Schema v1.3
-- Migration: 20260913000000
-- PL-03: Referral threading on landing table, plus
-- authorizations, invites, and events tables.
-- ============================================================

-- ── (a) Landing table v1.3: referral threading ──────────────

ALTER TABLE public.policy_lens_intakes
  ADD COLUMN referral_code text,
  ADD COLUMN referred_by   text;

CREATE UNIQUE INDEX idx_pli_referral_code
  ON public.policy_lens_intakes (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX idx_pli_referred_by
  ON public.policy_lens_intakes (referred_by);

ALTER TABLE public.policy_lens_intakes
  ALTER COLUMN schema_version SET DEFAULT '1.3';

COMMENT ON TABLE public.policy_lens_intakes IS
  'Policy Lens intake landing zone. Schema v1.3 LOCKED. v1.3 adds referral_code (this intake''s shareable code, partial-unique) and referred_by (code this intake arrived through). Column changes require a versioned migration + explicit approval. Rows are never deleted; extracted_fields immutable once status=verified.';


-- ── (b) AUTHORIZATIONS — audit-grade consent record (agent door) ──

CREATE TABLE public.policy_lens_authorizations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id           uuid NOT NULL REFERENCES public.policy_lens_intakes(id),
  client_name         text,
  client_email        text,
  method              text NOT NULL CHECK (method IN ('esign','attest')),
  status              text NOT NULL DEFAULT 'requested'
                      CHECK (status IN ('requested','signed','attested','withdrawn')),
  disclosure_version  text,
  signature_name      text,
  signed_at           timestamptz,
  sign_ip             text,
  sign_user_agent     text,
  attested_at         timestamptz,
  attestation_date    date,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pla_intake ON public.policy_lens_authorizations (intake_id);
CREATE INDEX idx_pla_status ON public.policy_lens_authorizations (status);

ALTER TABLE public.policy_lens_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pla_service_role ON public.policy_lens_authorizations;
CREATE POLICY pla_service_role ON public.policy_lens_authorizations
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS pla_admin_select ON public.policy_lens_authorizations;
CREATE POLICY pla_admin_select ON public.policy_lens_authorizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'platform_admin'
    )
  );

COMMENT ON TABLE public.policy_lens_authorizations IS
  'Policy Lens consent record. Audit-grade: signature fields immutable once set.';


-- ── (c) INVITES — peer invite log (flywheel) ───────────────

CREATE TABLE public.policy_lens_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id       uuid REFERENCES public.policy_lens_intakes(id),
  referral_code   text,
  recipient_name  text,
  recipient_email text,
  channel         text NOT NULL DEFAULT 'email'
                  CHECK (channel IN ('email','link')),
  sent_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plinv_referral ON public.policy_lens_invites (referral_code);

ALTER TABLE public.policy_lens_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plinv_service_role ON public.policy_lens_invites;
CREATE POLICY plinv_service_role ON public.policy_lens_invites
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS plinv_admin_select ON public.policy_lens_invites;
CREATE POLICY plinv_admin_select ON public.policy_lens_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'platform_admin'
    )
  );

COMMENT ON TABLE public.policy_lens_invites IS
  'Policy Lens peer invite log. Flywheel: tracks who invited whom.';


-- ── (d) EVENTS — funnel/K-factor event log ──────────────────

CREATE TABLE public.policy_lens_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL CHECK (event_type IN
                ('link_opened','intake_started','uploaded',
                 'report_sent','invite_sent','authorization_signed')),
  intake_id     uuid REFERENCES public.policy_lens_intakes(id),
  referral_code text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ple_type_created ON public.policy_lens_events (event_type, created_at DESC);
CREATE INDEX idx_ple_referral ON public.policy_lens_events (referral_code);

ALTER TABLE public.policy_lens_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ple_service_role ON public.policy_lens_events;
CREATE POLICY ple_service_role ON public.policy_lens_events
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS ple_admin_select ON public.policy_lens_events;
CREATE POLICY ple_admin_select ON public.policy_lens_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'platform_admin'
    )
  );

COMMENT ON TABLE public.policy_lens_events IS
  'Policy Lens append-only funnel/K-factor event log.';


-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260913000000')
ON CONFLICT DO NOTHING;
