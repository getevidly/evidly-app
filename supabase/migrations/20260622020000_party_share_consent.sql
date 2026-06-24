-- Migration 20260622020000 — Third-party per-pillar share consent
-- Insured (organization) grants a party (carrier/broker) consent to view compliance data
-- for ONE pillar. Roster always visible (book relationship); compliance data gated per-pillar
-- by this consent. Two tables: current state (toggle one row, fast RLS check) + append-only
-- ledger (convention-immutable, mirrors permission_audit_log — no trigger, matching house style).

CREATE TABLE public.external_party_share_consent (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id),
  party_id         uuid NOT NULL REFERENCES public.external_parties(id),
  pillar           text NOT NULL,
  status           text NOT NULL DEFAULT 'active',
  granted_by       uuid,
  granted_at       timestamptz NOT NULL DEFAULT now(),
  revoked_by       uuid,
  revoked_at       timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT epsc_pillar_chk  CHECK (pillar IN ('fire_safety','food_safety')),
  CONSTRAINT epsc_status_chk  CHECK (status IN ('active','revoked')),
  CONSTRAINT epsc_unique_grant UNIQUE (organization_id, party_id, pillar)
);

CREATE INDEX epsc_party_active_idx
  ON public.external_party_share_consent (party_id, pillar) WHERE status = 'active';
CREATE INDEX epsc_org_idx ON public.external_party_share_consent (organization_id);

CREATE TABLE public.external_party_consent_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id),
  party_id         uuid NOT NULL REFERENCES public.external_parties(id),
  pillar           text NOT NULL,
  action           text NOT NULL,
  changed_by       uuid,
  reason           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT epcl_pillar_chk CHECK (pillar IN ('fire_safety','food_safety')),
  CONSTRAINT epcl_action_chk CHECK (action IN ('grant','revoke'))
);

CREATE INDEX epcl_lookup_idx ON public.external_party_consent_log (organization_id, party_id, pillar, created_at);

ALTER TABLE public.external_party_share_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_party_consent_log   ENABLE ROW LEVEL SECURITY;

CREATE POLICY epsc_select_org ON public.external_party_share_consent FOR SELECT TO authenticated
  USING (organization_id = (SELECT up.organization_id FROM public.user_profiles up WHERE up.id = auth.uid()));

CREATE POLICY epsc_select_party ON public.external_party_share_consent FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.external_party_members epm
                 WHERE epm.user_id = auth.uid() AND epm.party_id = external_party_share_consent.party_id));

CREATE POLICY epsc_write_org ON public.external_party_share_consent FOR ALL TO authenticated
  USING (organization_id = (SELECT up.organization_id FROM public.user_profiles up WHERE up.id = auth.uid())
         AND EXISTS (SELECT 1 FROM public.user_profiles up2 WHERE up2.id = auth.uid() AND up2.role IN ('owner_operator','platform_admin')))
  WITH CHECK (organization_id = (SELECT up.organization_id FROM public.user_profiles up WHERE up.id = auth.uid()));

CREATE POLICY epcl_select_org ON public.external_party_consent_log FOR SELECT TO authenticated
  USING (organization_id = (SELECT up.organization_id FROM public.user_profiles up WHERE up.id = auth.uid()));

CREATE POLICY epcl_select_party ON public.external_party_consent_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.external_party_members epm
                 WHERE epm.user_id = auth.uid() AND epm.party_id = external_party_consent_log.party_id));

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260622020000') ON CONFLICT DO NOTHING;
