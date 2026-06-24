-- ============================================================
-- Migration: 20260623000000_consent_disclosure_layer
--
-- Consent layer for Policy Lens disclosure grants.
-- Three consent objects (do not conflate):
--   1. policy_lens_authorizations — extraction consent (UNTOUCHED)
--   2. pl_report_grants — per-report disclosure (ALTER, LIVE)
--   3. external_party_share_consent — standing disclosure (ALTER, DARK)
--
-- Plus: pl_disclosure_events (CREATE) — defensibility trail.
-- Plus: RLS for broker-scoped isolation on grants + events.
--
-- §1731: consent governs DISCLOSURE only; changes nothing about
-- what PL asserts. Status sourced from drift_catches (EVE), not PL.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART A — ALTER pl_report_grants (per-report, LIVE)
-- ════════════════════════════════════════════════════════════

-- Bind each grant to both ends: insured org + broker party.
-- consent_type distinguishes per-report (live) from standing (dark).
ALTER TABLE public.pl_report_grants
  ADD COLUMN IF NOT EXISTS granted_by_org_id   uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS recipient_party_id   uuid REFERENCES public.external_parties(id),
  ADD COLUMN IF NOT EXISTS consent_type         text NOT NULL DEFAULT 'per_report',
  ADD COLUMN IF NOT EXISTS consent_reference    uuid;

-- Constraint: consent_type must be per_report or standing
ALTER TABLE public.pl_report_grants
  ADD CONSTRAINT pl_rg_consent_type_chk
  CHECK (consent_type IN ('per_report', 'standing'));

-- Index for broker-scoped reads (RLS performance)
CREATE INDEX IF NOT EXISTS idx_pl_report_grants_recipient
  ON public.pl_report_grants (recipient_party_id);

CREATE INDEX IF NOT EXISTS idx_pl_report_grants_org
  ON public.pl_report_grants (granted_by_org_id);

-- RLS: broker reads only grants addressed to their party.
-- Mirrors the proven carrier isolation pattern (drift_catches_select_carrier).
CREATE POLICY pl_rg_select_broker
  ON public.pl_report_grants
  FOR SELECT
  TO authenticated
  USING (
    recipient_party_id IN (
      SELECT epm.party_id
      FROM public.external_party_members epm
      WHERE epm.user_id = auth.uid()
    )
  );

COMMENT ON COLUMN public.pl_report_grants.granted_by_org_id IS
  'Organization (insured) that authorized this disclosure.';
COMMENT ON COLUMN public.pl_report_grants.recipient_party_id IS
  'External party (broker) authorized to receive this disclosure.';
COMMENT ON COLUMN public.pl_report_grants.consent_type IS
  'per_report = one disclosure, one report. standing = dark (not wired live).';
COMMENT ON COLUMN public.pl_report_grants.consent_reference IS
  'FK to the consent record authorizing this grant (external_party_share_consent.id for standing, or self-referential for per-report where consent is captured at mint time).';


-- ════════════════════════════════════════════════════════════
-- PART B — ALTER external_party_share_consent (standing, DARK)
-- ════════════════════════════════════════════════════════════

-- Design choice: dedicated `resource` column, NOT overloading the
-- pillar enum. The consent wording must read precisely in a dispute:
-- "authorized disclosure of Policy Lens condition status," not
-- "consented to a pillar." `pillar` stays as the operational
-- dimension; `resource` is the consent scope.
--
-- resource values:
--   'compliance_data'       — existing implicit scope (fire/food compliance signals)
--   'policy_lens_status'    — PSE condition status from PL findings
--
-- GATED OFF: built + tested, no live broker flow reads through it.

ALTER TABLE public.external_party_share_consent
  ADD COLUMN IF NOT EXISTS resource             text NOT NULL DEFAULT 'compliance_data',
  ADD COLUMN IF NOT EXISTS expires_at           timestamptz,
  ADD COLUMN IF NOT EXISTS disclosure_version   text;

ALTER TABLE public.external_party_share_consent
  ADD CONSTRAINT epsc_resource_chk
  CHECK (resource IN ('compliance_data', 'policy_lens_status'));

-- Drop and re-create the unique constraint to include resource.
-- Existing rows all have resource='compliance_data' (the default),
-- so no conflict. The new constraint prevents duplicate grants for
-- the same org+party+pillar+resource combination.
ALTER TABLE public.external_party_share_consent
  DROP CONSTRAINT IF EXISTS epsc_unique_grant;

ALTER TABLE public.external_party_share_consent
  ADD CONSTRAINT epsc_unique_grant
  UNIQUE (organization_id, party_id, pillar, resource);

-- Extend the consent log to track resource + disclosure_version
ALTER TABLE public.external_party_consent_log
  ADD COLUMN IF NOT EXISTS resource             text NOT NULL DEFAULT 'compliance_data',
  ADD COLUMN IF NOT EXISTS disclosure_version   text;

ALTER TABLE public.external_party_consent_log
  ADD CONSTRAINT epcl_resource_chk
  CHECK (resource IN ('compliance_data', 'policy_lens_status'));

COMMENT ON COLUMN public.external_party_share_consent.resource IS
  'Consent scope: compliance_data (operational signals) or policy_lens_status (PSE condition status from PL findings). Standing grant for policy_lens_status is DARK — not wired live.';
COMMENT ON COLUMN public.external_party_share_consent.expires_at IS
  'Optional expiration for standing grants. NULL = no expiry (revoke-only).';
COMMENT ON COLUMN public.external_party_share_consent.disclosure_version IS
  'Version of the disclosure language the insured authorized.';


-- ════════════════════════════════════════════════════════════
-- PART C — CREATE pl_disclosure_events (defensibility trail)
-- ════════════════════════════════════════════════════════════

-- Append-only event log for EVERY disclosure, both paths.
-- Write-once posture, consistent with the evidence engine.
-- No UPDATE or DELETE policies — convention-immutable.

CREATE TABLE public.pl_disclosure_events (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id           uuid        NOT NULL REFERENCES public.pl_report_grants(id),
  grant_type         text        NOT NULL,
  accessor_user_id   uuid,
  accessor_party_id  uuid        REFERENCES public.external_parties(id),
  accessed_at        timestamptz NOT NULL DEFAULT now(),
  ip                 text,
  user_agent         text,
  CONSTRAINT plde_grant_type_chk CHECK (grant_type IN ('per_report', 'standing'))
);

CREATE INDEX idx_plde_grant    ON public.pl_disclosure_events (grant_id);
CREATE INDEX idx_plde_accessor ON public.pl_disclosure_events (accessor_party_id, accessed_at DESC);
CREATE INDEX idx_plde_time     ON public.pl_disclosure_events (accessed_at DESC);

ALTER TABLE public.pl_disclosure_events ENABLE ROW LEVEL SECURITY;

-- Service role: full access (edge functions write events)
CREATE POLICY plde_service
  ON public.pl_disclosure_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Platform admin: read all events
CREATE POLICY plde_admin_select
  ON public.pl_disclosure_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- Org members: read events for grants originated by their org
CREATE POLICY plde_org_select
  ON public.pl_disclosure_events
  FOR SELECT
  TO authenticated
  USING (
    grant_id IN (
      SELECT rg.id FROM public.pl_report_grants rg
      WHERE rg.granted_by_org_id = (
        SELECT up.organization_id FROM public.user_profiles up
        WHERE up.id = auth.uid()
      )
    )
  );

-- Broker: read events for their own party's disclosures
CREATE POLICY plde_broker_select
  ON public.pl_disclosure_events
  FOR SELECT
  TO authenticated
  USING (
    accessor_party_id IN (
      SELECT epm.party_id
      FROM public.external_party_members epm
      WHERE epm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.pl_disclosure_events IS
  'Append-only defensibility record. Every disclosure of PL findings — per-report or standing — logs one row. Convention-immutable: no UPDATE/DELETE in application code.';


-- ── Migration tracker ─────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260623000000')
ON CONFLICT DO NOTHING;
