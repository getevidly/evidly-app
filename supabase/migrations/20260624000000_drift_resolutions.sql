/*
 * 20260624000000_drift_resolutions.sql
 *
 * Write-once drift_resolutions table — sealed via SHA-256, same engine
 * as inspection_reports and vendor_service_records. Once inserted, a
 * resolution row can NEVER be updated or deleted (immutability triggers).
 *
 * Pillar is carried from the drift_catch — Food and Fire never blended.
 */

-- ── Table ────────────────────────────────────────────────────────────

CREATE TABLE public.drift_resolutions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  drift_catch_id    uuid        NOT NULL REFERENCES public.drift_catches(id),
  organization_id   uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id       uuid        REFERENCES public.locations(id) ON DELETE SET NULL,
  pillar            text        NOT NULL CHECK (pillar IN ('food_safety', 'fire_safety')),
  drift_type        text        NOT NULL,
  requirement_source text,
  resolution_note   text,
  resolved_by       uuid        NOT NULL REFERENCES auth.users(id),
  resolved_at       timestamptz NOT NULL,
  sealed_at         timestamptz NOT NULL,
  sealed_by         uuid        NOT NULL REFERENCES auth.users(id),
  content_hash      text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── Immutability triggers — identical pattern to inspection_reports ──

CREATE OR REPLACE FUNCTION public.tg_drift_resolutions_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'drift_resolutions rows are immutable once sealed; a sealed resolution can never be altered or deleted. Attempted operation: %', TG_OP;
END;
$$;

CREATE TRIGGER drift_resolutions_immutable_no_update
  BEFORE UPDATE ON public.drift_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.tg_drift_resolutions_immutable();

CREATE TRIGGER drift_resolutions_immutable_no_delete
  BEFORE DELETE ON public.drift_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.tg_drift_resolutions_immutable();

-- ── Indexes ──────────────────────────────────────────────────────────

CREATE INDEX idx_drift_resolutions_catch ON public.drift_resolutions (drift_catch_id);
CREATE INDEX idx_drift_resolutions_org_sealed ON public.drift_resolutions (organization_id, sealed_at);

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.drift_resolutions ENABLE ROW LEVEL SECURITY;

-- Org members can read their own org's resolutions
CREATE POLICY "Org members read drift resolutions"
  ON public.drift_resolutions FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- Service role has full access (edge function writes via service key)
CREATE POLICY "Service role full access drift resolutions"
  ON public.drift_resolutions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
