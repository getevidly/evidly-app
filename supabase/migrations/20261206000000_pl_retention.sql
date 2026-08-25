-- ============================================================
-- POLICY LENS RETENTION — Migration 20261205000000
--
-- 1. policy_lens_intakes: retention_choice / purge_due_at / purged_at
-- 2. Widen policy_lens_intakes.source CHECK to include 'in_app'
--    (pl-intake-start-inapp has been inserting 'in_app'; no
--     migration in the ledger ever widened the constraint)
-- 3. pl_pse_symbol_registry: authenticated SELECT policy
--    (registry reference data — form symbols, no client content;
--     useWhatsAtRisk.ts reads it from the browser)
-- 4. pl_redact_sealed_report() + narrowed immutability trigger
--    (the seal stays write-once EXCEPT a single redaction write
--     that blanks report_jsonb and touches nothing else)
-- ============================================================


-- ── 1. Retention columns ────────────────────────────────────

ALTER TABLE public.policy_lens_intakes
  ADD COLUMN IF NOT EXISTS retention_choice text NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS purge_due_at     timestamptz,
  ADD COLUMN IF NOT EXISTS purged_at        timestamptz;

ALTER TABLE public.policy_lens_intakes
  DROP CONSTRAINT IF EXISTS pli_retention_choice_chk;

ALTER TABLE public.policy_lens_intakes
  ADD CONSTRAINT pli_retention_choice_chk
  CHECK (retention_choice IN ('immediate','hold_30'));

COMMENT ON COLUMN public.policy_lens_intakes.retention_choice IS
  'How long the uploaded policy PDF is retained after the reading is released. immediate = purge on release; hold_30 = purge 30 days after release.';
COMMENT ON COLUMN public.policy_lens_intakes.purge_due_at IS
  'When the policy PDF becomes eligible for purge. NULL = not yet scheduled.';
COMMENT ON COLUMN public.policy_lens_intakes.purged_at IS
  'When the policy PDF was actually removed from policy-lens-uploads. NULL = still stored.';


-- ── 2. Widen the source CHECK ───────────────────────────────
-- Matches only the source-enum constraint (normalized to
-- "source = ANY (ARRAY[...])"). Deliberately does NOT match
-- pli_contact_email_by_source, which is "source <> 'prospect' OR ...".

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM   pg_constraint
    WHERE  conrelid = 'public.policy_lens_intakes'::regclass
      AND  contype  = 'c'
      AND  pg_get_constraintdef(oid) ILIKE '%source = ANY%'
  LOOP
    EXECUTE format('ALTER TABLE public.policy_lens_intakes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.policy_lens_intakes
  ADD CONSTRAINT policy_lens_intakes_source_check
  CHECK (source IN ('prospect','agent','in_app'));


-- ── 3. pl_pse_symbol_registry — authenticated read ──────────

DROP POLICY IF EXISTS pl_pse_symbol_registry_select_auth
  ON public.pl_pse_symbol_registry;

CREATE POLICY pl_pse_symbol_registry_select_auth
  ON public.pl_pse_symbol_registry
  FOR SELECT TO authenticated
  USING (true);


-- ── 4. Sealed-report redaction ──────────────────────────────
-- The trigger function backs BOTH pl_sealed_no_update and
-- pl_sealed_no_delete, so it branches on TG_OP. DELETE is still
-- unconditionally refused. UPDATE is permitted in exactly one
-- shape: report_jsonb becomes the redaction marker and every
-- other column — id, run_id, intake_id, content_hash, sealed_at,
-- sealed_by, created_at — is byte-identical.

CREATE OR REPLACE FUNCTION tg_pl_sealed_reports_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.report_jsonb = '{"redacted": true}'::jsonb
     AND NEW.id           IS NOT DISTINCT FROM OLD.id
     AND NEW.run_id       IS NOT DISTINCT FROM OLD.run_id
     AND NEW.intake_id    IS NOT DISTINCT FROM OLD.intake_id
     AND NEW.content_hash IS NOT DISTINCT FROM OLD.content_hash
     AND NEW.sealed_at    IS NOT DISTINCT FROM OLD.sealed_at
     AND NEW.sealed_by    IS NOT DISTINCT FROM OLD.sealed_by
     AND NEW.created_at   IS NOT DISTINCT FROM OLD.created_at
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'pl_sealed_reports rows are immutable once sealed. Attempted: %', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pl_sealed_no_update ON pl_sealed_reports;
CREATE TRIGGER pl_sealed_no_update BEFORE UPDATE ON pl_sealed_reports
  FOR EACH ROW EXECUTE FUNCTION tg_pl_sealed_reports_immutable();

DROP TRIGGER IF EXISTS pl_sealed_no_delete ON pl_sealed_reports;
CREATE TRIGGER pl_sealed_no_delete BEFORE DELETE ON pl_sealed_reports
  FOR EACH ROW EXECUTE FUNCTION tg_pl_sealed_reports_immutable();

-- Redaction entry point. content_hash / sealed_at / sealed_by are
-- left untouched by design: the hash no longer matches the stored
-- report_jsonb, and verify-pl-report will therefore report the row
-- as altered. That mismatch IS the redaction's evidence trail.
CREATE OR REPLACE FUNCTION public.pl_redact_sealed_report(p_intake_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE pl_sealed_reports
     SET report_jsonb = '{"redacted": true}'::jsonb
   WHERE intake_id = p_intake_id
     AND report_jsonb IS DISTINCT FROM '{"redacted": true}'::jsonb;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL     ON FUNCTION public.pl_redact_sealed_report(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.pl_redact_sealed_report(uuid) TO service_role;

COMMENT ON FUNCTION public.pl_redact_sealed_report(uuid) IS
  'Retention purge: blanks report_jsonb on every sealed report for an intake. SECURITY DEFINER, service_role only. content_hash is intentionally preserved, so verify-pl-report reports a redacted seal as altered.';
