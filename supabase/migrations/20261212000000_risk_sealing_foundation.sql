-- ============================================================
-- Migration: 20261212000000_risk_sealing_foundation
--
-- Purpose:
--   1. PART A — reconcile `incidents` and `corrective_actions` to prod
--      truth. Prod has drifted ahead of this repo on both tables: the
--      authoritative column lists were read from information_schema.columns
--      on the live database. This migration makes the repo able to rebuild
--      that schema from scratch. On live prod every statement here is a
--      no-op; on a fresh `db reset` it is the whole reconciliation.
--   2. PART B — the write-once sealing foundation for risk evidence:
--      incident_seals and corrective_action_seals, following the
--      drift_resolutions pattern (20260624000000) exactly — an
--      EXCEPTION-raising plpgsql function per table plus BEFORE UPDATE /
--      BEFORE DELETE row triggers, org-member SELECT RLS, service_role
--      writes. Sealed rows can never be altered or deleted; corrections
--      go through supersession via supersedes_id.
--
--   Sealing an incident or a corrective action also LOCKS the live row it
--   points at: once seal_id is set, that row's substantive columns are
--   frozen. Only seal_id, archived_at and updated_at may still move.
--
--   No ON DELETE actions on any seal foreign key, by design — sealed
--   evidence blocks deletion of the record it attests to.
--
-- DOWN NOTE (revert)
--   `git revert <commit>` removes this file from the repo but does NOT
--   drop the objects. To undo in the database, run IN THIS ORDER:
--
--     -- 1. Live-row lock triggers, then their functions
--     DROP TRIGGER IF EXISTS incidents_locked_when_sealed_no_update ON public.incidents;
--     DROP TRIGGER IF EXISTS incidents_locked_when_sealed_no_delete ON public.incidents;
--     DROP TRIGGER IF EXISTS corrective_actions_locked_when_sealed_no_update ON public.corrective_actions;
--     DROP TRIGGER IF EXISTS corrective_actions_locked_when_sealed_no_delete ON public.corrective_actions;
--     DROP FUNCTION IF EXISTS public.tg_incidents_locked_when_sealed();
--     DROP FUNCTION IF EXISTS public.tg_corrective_actions_locked_when_sealed();
--
--     -- 2. Pointer columns — MUST precede the seal tables they reference
--     ALTER TABLE public.incidents          DROP COLUMN IF EXISTS seal_id;
--     ALTER TABLE public.corrective_actions DROP COLUMN IF EXISTS seal_id;
--
--     -- 3. Seal tables (their own triggers and indexes drop with them)
--     DROP TABLE IF EXISTS public.corrective_action_seals;
--     DROP TABLE IF EXISTS public.incident_seals;
--
--     -- 4. Immutability functions
--     DROP FUNCTION IF EXISTS public.tg_incident_seals_immutable();
--     DROP FUNCTION IF EXISTS public.tg_corrective_action_seals_immutable();
--
--     -- 5. Repair the ledger
--     supabase migration repair --status reverted 20261212000000
--
--   PART A is deliberately NOT reversed by the above. It aligned the repo
--   to prod truth; undoing it would re-introduce the drift.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART A — RECONCILE TO PROD TRUTH
-- ════════════════════════════════════════════════════════════

-- ── A1. incidents — columns prod has that no repo migration creates ──

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS template_id                uuid,
  ADD COLUMN IF NOT EXISTS requires_regulatory_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS regulatory_citation        text,
  ADD COLUMN IF NOT EXISTS resolved_by                uuid,
  ADD COLUMN IF NOT EXISTS archived_at                timestamptz,
  ADD COLUMN IF NOT EXISTS ai_draft                   text,
  ADD COLUMN IF NOT EXISTS history                    jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS urgency_label              varchar;


-- ── A2. corrective_actions — same ──

ALTER TABLE public.corrective_actions
  ADD COLUMN IF NOT EXISTS pillar  varchar,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;


-- ── A3. incidents — type alignment, guarded ──
--
-- Five columns the stale repo CREATE TABLE declares with the wrong type:
--   photos, resolution_photos       jsonb -> text[]
--   assigned_to, reported_by, verified_by   text -> uuid
--
-- Prod already holds the target types, so this loop does nothing there.
-- On a fresh reset the table is empty and the column is rebuilt cleanly.
-- If a mismatched column is ever found with rows behind it, this RAISES
-- rather than converting — data shape decisions are not made silently in
-- a migration.

DO $align$
DECLARE
  _col  text;
  _want text;   -- expected pg_type.typname (udt_name)
  _ddl  text;   -- type + default used when re-adding
  _have text;
  _rows bigint;
BEGIN
  IF to_regclass('public.incidents') IS NULL THEN
    RAISE NOTICE 'incidents does not exist — type alignment skipped';
    RETURN;
  END IF;

  FOR _col, _want, _ddl IN
    SELECT v.col, v.want, v.ddl
    FROM (VALUES
      ('photos',            '_text', 'text[] DEFAULT ''{}'''),
      ('resolution_photos', '_text', 'text[] DEFAULT ''{}'''),
      ('assigned_to',       'uuid',  'uuid'),
      ('reported_by',       'uuid',  'uuid'),
      ('verified_by',       'uuid',  'uuid')
    ) AS v(col, want, ddl)
  LOOP
    SELECT c.udt_name INTO _have
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name   = 'incidents'
      AND c.column_name  = _col;

    IF _have IS NULL THEN
      EXECUTE format(
        'ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS %I %s', _col, _ddl);
      RAISE NOTICE 'incidents.%: absent — added as %', _col, _ddl;

    ELSIF _have = _want THEN
      RAISE NOTICE 'incidents.%: already % — no action', _col, _want;

    ELSE
      EXECUTE 'SELECT count(*) FROM public.incidents' INTO _rows;

      IF _rows = 0 THEN
        EXECUTE format('ALTER TABLE public.incidents DROP COLUMN IF EXISTS %I', _col);
        EXECUTE format('ALTER TABLE public.incidents ADD COLUMN %I %s', _col, _ddl);
        RAISE NOTICE 'incidents.%: was %, table empty — rebuilt as %', _col, _have, _ddl;
      ELSE
        RAISE EXCEPTION
          'incidents.% is % but prod is %, and the table holds % row(s). '
          'Refusing to convert data silently — resolve this column by hand '
          'with an explicit USING clause before re-running.',
          _col, _have, _want, _rows;
      END IF;
    END IF;
  END LOOP;
END
$align$;


-- ── A4. incidents — drop columns prod does not have ──
--
-- regulatory_report_required was superseded by requires_regulatory_report
-- (added in A1). The two filed_* columns have no prod counterpart at all.
-- All three are absent from prod, so these are no-ops there.

ALTER TABLE public.incidents
  DROP COLUMN IF EXISTS regulatory_report_required,
  DROP COLUMN IF EXISTS regulatory_report_filed_at,
  DROP COLUMN IF EXISTS regulatory_report_filed_by;


-- ── A5. incidents — CHECK constraints to prod definitions ──

-- Gone in prod: type and root_cause are unconstrained free text there.
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_type_check;
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_root_cause_check;

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_category_check;
ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_category_check
  CHECK (category IN ('food_safety', 'fire_safety', 'facility_services'));

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_severity_check
  CHECK (severity IN ('critical', 'high', 'medium', 'low'));

-- Belt and braces before the status constraint: prod already enforces the
-- live four so it cannot hold violating rows unless the constraint was
-- added NOT VALID. This UPDATE is a no-op on clean prod and repairs the
-- legacy chain anywhere it survived. Mapping is the one the app now uses:
-- reported -> open, assigned -> investigating, in_progress -> investigating.
UPDATE incidents
SET status = CASE status
               WHEN 'reported'    THEN 'open'
               WHEN 'assigned'    THEN 'investigating'
               WHEN 'in_progress' THEN 'investigating'
               ELSE status
             END
WHERE status IN ('reported', 'assigned', 'in_progress');

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('open', 'investigating', 'resolved', 'verified'));

ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_urgency_label_check;
ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_urgency_label_check
  CHECK (urgency_label IN ('immediate', '4_hours', 'same_day', '1_day', '7_days'));


-- ── A6. corrective_actions — CHECK constraints to prod definitions ──
--
-- This chain is NOT the incident chain and is correct as it stands:
-- reported / assigned / in_progress / resolved / verified.

ALTER TABLE public.corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_category_check;
ALTER TABLE public.corrective_actions
  ADD CONSTRAINT corrective_actions_category_check
  CHECK (category IN ('food_safety', 'fire_safety', 'facility_services'));

ALTER TABLE public.corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_pillar_check;
ALTER TABLE public.corrective_actions
  ADD CONSTRAINT corrective_actions_pillar_check
  CHECK (pillar IN ('food_safety', 'fire_safety'));

ALTER TABLE public.corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_severity_check;
ALTER TABLE public.corrective_actions
  ADD CONSTRAINT corrective_actions_severity_check
  CHECK (severity IN ('critical', 'high', 'medium', 'low'));

ALTER TABLE public.corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_status_check;
ALTER TABLE public.corrective_actions
  ADD CONSTRAINT corrective_actions_status_check
  CHECK (status IN ('reported', 'assigned', 'in_progress', 'resolved', 'verified'));

-- 'drift' and 'record_expiry' are NEW by design — the approved spawn
-- sources for corrective actions raised from operational drift and from
-- an expiring record. Added here so this constraint is rebuilt once.
ALTER TABLE public.corrective_actions DROP CONSTRAINT IF EXISTS corrective_actions_source_type_check;
ALTER TABLE public.corrective_actions
  ADD CONSTRAINT corrective_actions_source_type_check
  CHECK (
    source_type IS NULL
    OR source_type IN (
      'inspection', 'checklist', 'temperature', 'self_inspection',
      'manual', 'incident', 'drift', 'record_expiry'
    )
  );


-- ════════════════════════════════════════════════════════════
-- PART B — SEALING FOUNDATION
-- ════════════════════════════════════════════════════════════

-- ── B1. incident_seals ──
-- No ON DELETE actions: a seal blocks deletion of the incident it attests to.

CREATE TABLE IF NOT EXISTS public.incident_seals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  location_id     uuid        REFERENCES public.locations(id),
  incident_id     uuid        NOT NULL REFERENCES public.incidents(id),
  canonical_json  jsonb       NOT NULL,
  content_hash    text        NOT NULL,
  photo_hashes    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  sealed_at       timestamptz NOT NULL,
  sealed_by       uuid        NOT NULL REFERENCES auth.users(id),
  supersedes_id   uuid        REFERENCES public.incident_seals(id),
  source          text        NOT NULL DEFAULT 'evidentiary_seal',
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.incident_seals IS
  'Write-once evidentiary seal over an incident. content_hash is SHA-256 over the canonical JSON per _shared/seal-canonicalization.ts. Corrections supersede, never mutate.';


-- ── B2. corrective_action_seals ──

CREATE TABLE IF NOT EXISTS public.corrective_action_seals (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        NOT NULL REFERENCES public.organizations(id),
  location_id          uuid        REFERENCES public.locations(id),
  corrective_action_id uuid        NOT NULL REFERENCES public.corrective_actions(id),
  canonical_json       jsonb       NOT NULL,
  content_hash         text        NOT NULL,
  sealed_at            timestamptz NOT NULL,
  sealed_by            uuid        NOT NULL REFERENCES auth.users(id),
  supersedes_id        uuid        REFERENCES public.corrective_action_seals(id),
  source               text        NOT NULL DEFAULT 'evidentiary_seal',
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.corrective_action_seals IS
  'Write-once evidentiary seal over a corrective action. Same engine as incident_seals and drift_resolutions.';


-- ── B3. Immutability — identical pattern to drift_resolutions ──
-- Unconditional. No state check, no exemption, no service_role bypass.

CREATE OR REPLACE FUNCTION public.tg_incident_seals_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'incident_seals rows are immutable once sealed; a sealed incident record can never be altered or deleted. Supersede it instead. Attempted operation: %', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS incident_seals_immutable_no_update ON public.incident_seals;
CREATE TRIGGER incident_seals_immutable_no_update
  BEFORE UPDATE ON public.incident_seals
  FOR EACH ROW EXECUTE FUNCTION public.tg_incident_seals_immutable();

DROP TRIGGER IF EXISTS incident_seals_immutable_no_delete ON public.incident_seals;
CREATE TRIGGER incident_seals_immutable_no_delete
  BEFORE DELETE ON public.incident_seals
  FOR EACH ROW EXECUTE FUNCTION public.tg_incident_seals_immutable();

CREATE OR REPLACE FUNCTION public.tg_corrective_action_seals_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'corrective_action_seals rows are immutable once sealed; a sealed corrective action record can never be altered or deleted. Supersede it instead. Attempted operation: %', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS corrective_action_seals_immutable_no_update ON public.corrective_action_seals;
CREATE TRIGGER corrective_action_seals_immutable_no_update
  BEFORE UPDATE ON public.corrective_action_seals
  FOR EACH ROW EXECUTE FUNCTION public.tg_corrective_action_seals_immutable();

DROP TRIGGER IF EXISTS corrective_action_seals_immutable_no_delete ON public.corrective_action_seals;
CREATE TRIGGER corrective_action_seals_immutable_no_delete
  BEFORE DELETE ON public.corrective_action_seals
  FOR EACH ROW EXECUTE FUNCTION public.tg_corrective_action_seals_immutable();


-- ── B4. RLS ──
-- Read-only for org members. No authenticated INSERT/UPDATE/DELETE policy
-- exists by design: seals are written by edge functions under the service
-- role, which resolves sealed_by from the caller's verified JWT.

ALTER TABLE public.incident_seals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_action_seals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incident_seals_org_read ON public.incident_seals;
CREATE POLICY incident_seals_org_read
  ON public.incident_seals FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS incident_seals_service ON public.incident_seals;
CREATE POLICY incident_seals_service
  ON public.incident_seals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS incident_seals_platform_admin ON public.incident_seals;
CREATE POLICY incident_seals_platform_admin
  ON public.incident_seals FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS corrective_action_seals_org_read ON public.corrective_action_seals;
CREATE POLICY corrective_action_seals_org_read
  ON public.corrective_action_seals FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS corrective_action_seals_service ON public.corrective_action_seals;
CREATE POLICY corrective_action_seals_service
  ON public.corrective_action_seals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS corrective_action_seals_platform_admin ON public.corrective_action_seals;
CREATE POLICY corrective_action_seals_platform_admin
  ON public.corrective_action_seals FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());


-- ── B5. Grants ──
--
-- anon gets nothing at all. authenticated is revoked first, then given back
-- SELECT only — RLS then restricts every row to the caller's own org.
--
-- The REVOKE is load-bearing: Supabase's default privileges hand
-- authenticated ALL on new public tables, and TRUNCATE is NOT subject to
-- RLS. Without this, any logged-in user could empty either seal table —
-- and the immutability triggers would not stop them, because TRUNCATE
-- fires no row-level trigger.

REVOKE ALL ON public.incident_seals          FROM anon;
REVOKE ALL ON public.corrective_action_seals FROM anon;

REVOKE ALL ON public.incident_seals          FROM authenticated;
REVOKE ALL ON public.corrective_action_seals FROM authenticated;

GRANT SELECT ON public.incident_seals          TO authenticated;
GRANT SELECT ON public.corrective_action_seals TO authenticated;


-- ── B6. Indexes ──

CREATE INDEX IF NOT EXISTS idx_incident_seals_incident
  ON public.incident_seals (incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_seals_org
  ON public.incident_seals (organization_id);
CREATE INDEX IF NOT EXISTS idx_incident_seals_sealed_at
  ON public.incident_seals (sealed_at);
CREATE INDEX IF NOT EXISTS idx_incident_seals_supersedes
  ON public.incident_seals (supersedes_id)
  WHERE supersedes_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_corrective_action_seals_action
  ON public.corrective_action_seals (corrective_action_id);
CREATE INDEX IF NOT EXISTS idx_corrective_action_seals_org
  ON public.corrective_action_seals (organization_id);
CREATE INDEX IF NOT EXISTS idx_corrective_action_seals_sealed_at
  ON public.corrective_action_seals (sealed_at);
CREATE INDEX IF NOT EXISTS idx_corrective_action_seals_supersedes
  ON public.corrective_action_seals (supersedes_id)
  WHERE supersedes_id IS NOT NULL;


-- ── B7. Live-row seal pointers ──

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS seal_id uuid REFERENCES public.incident_seals(id);

ALTER TABLE public.corrective_actions
  ADD COLUMN IF NOT EXISTS seal_id uuid REFERENCES public.corrective_action_seals(id);

COMMENT ON COLUMN public.incidents.seal_id IS
  'Set when the incident is sealed. Non-null freezes the row — see tg_incidents_locked_when_sealed.';
COMMENT ON COLUMN public.corrective_actions.seal_id IS
  'Set when the corrective action is sealed. Non-null freezes the row — see tg_corrective_actions_locked_when_sealed.';


-- ── B8. Lock-on-seal — freeze the live row once it carries a seal ──
--
-- DELETE: refused outright while sealed.
-- UPDATE: permitted only if nothing substantive moved. seal_id, archived_at
-- and updated_at are excluded from the comparison so the seal can be
-- attached, the row archived, and the timestamp touched — everything else
-- is frozen and must go through supersession.

CREATE OR REPLACE FUNCTION public.tg_incidents_locked_when_sealed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.seal_id IS NOT NULL THEN
      RAISE EXCEPTION 'incident % is sealed and cannot be deleted; issue a superseding seal instead.', OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.seal_id IS NOT NULL THEN
    IF (to_jsonb(OLD) - ARRAY['seal_id', 'archived_at', 'updated_at'])
       IS DISTINCT FROM
       (to_jsonb(NEW) - ARRAY['seal_id', 'archived_at', 'updated_at'])
    THEN
      RAISE EXCEPTION 'incident % is sealed; its record can no longer be edited. Issue a superseding seal instead.', OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incidents_locked_when_sealed_no_update ON public.incidents;
CREATE TRIGGER incidents_locked_when_sealed_no_update
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.tg_incidents_locked_when_sealed();

DROP TRIGGER IF EXISTS incidents_locked_when_sealed_no_delete ON public.incidents;
CREATE TRIGGER incidents_locked_when_sealed_no_delete
  BEFORE DELETE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.tg_incidents_locked_when_sealed();

CREATE OR REPLACE FUNCTION public.tg_corrective_actions_locked_when_sealed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.seal_id IS NOT NULL THEN
      RAISE EXCEPTION 'corrective action % is sealed and cannot be deleted; issue a superseding seal instead.', OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.seal_id IS NOT NULL THEN
    IF (to_jsonb(OLD) - ARRAY['seal_id', 'archived_at', 'updated_at'])
       IS DISTINCT FROM
       (to_jsonb(NEW) - ARRAY['seal_id', 'archived_at', 'updated_at'])
    THEN
      RAISE EXCEPTION 'corrective action % is sealed; its record can no longer be edited. Issue a superseding seal instead.', OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS corrective_actions_locked_when_sealed_no_update ON public.corrective_actions;
CREATE TRIGGER corrective_actions_locked_when_sealed_no_update
  BEFORE UPDATE ON public.corrective_actions
  FOR EACH ROW EXECUTE FUNCTION public.tg_corrective_actions_locked_when_sealed();

DROP TRIGGER IF EXISTS corrective_actions_locked_when_sealed_no_delete ON public.corrective_actions;
CREATE TRIGGER corrective_actions_locked_when_sealed_no_delete
  BEFORE DELETE ON public.corrective_actions
  FOR EACH ROW EXECUTE FUNCTION public.tg_corrective_actions_locked_when_sealed();
