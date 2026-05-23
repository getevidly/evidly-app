-- =============================================================================
-- MIGRATION 34: ENGINE A AFTER INSERT TRIGGER
-- =============================================================================
-- Purpose: Fire Engine A automatically on every new inspection_reports row.
--
-- Behavior: AFTER INSERT trigger calls validate_inspection(NEW.id). Engine A
-- never raises (catch-all in validate_inspection writes result='error' on
-- any failure), so the trigger cannot block the insert.
--
-- Design choice: AFTER INSERT (not BEFORE). The inspection row exists in
-- the table before verification runs. If Engine A errors, the inspection is
-- still saved — verification just logs the failure. Source of truth is the
-- jurisdiction; we never block ingestion on engine behavior.
--
-- Scope: INSERT only. UPDATE re-verification is a separate concern (e.g.,
-- re-running engine after a grading_config_version change) — handled later
-- via explicit RPC call, not trigger.
--
-- Idempotent: DROP IF EXISTS before CREATE. Re-running produces identical state.
--
-- Target database: EvidLY PROD (irxgmhxhmxtzfwuieblc)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PRE-FLIGHT
-- -----------------------------------------------------------------------------
DO $preflight$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'validate_inspection'
    ) THEN
        RAISE EXCEPTION 'Pre-flight failed: public.validate_inspection() missing — run Migration 33 first';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'inspection_reports'
    ) THEN
        RAISE EXCEPTION 'Pre-flight failed: public.inspection_reports missing';
    END IF;

    RAISE NOTICE 'Pre-flight passed.';
END
$preflight$;

-- -----------------------------------------------------------------------------
-- TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_engine_a_validate_inspection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.validate_inspection(NEW.id);
    RETURN NEW;
END
$$;

-- -----------------------------------------------------------------------------
-- TRIGGER
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS engine_a_validate_inspection_after_insert
    ON public.inspection_reports;

CREATE TRIGGER engine_a_validate_inspection_after_insert
    AFTER INSERT ON public.inspection_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_engine_a_validate_inspection();

-- -----------------------------------------------------------------------------
-- SELF-VERIFY
-- -----------------------------------------------------------------------------
DO $verify$
DECLARE
    v_trigger_enabled char;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'tg_engine_a_validate_inspection'
    ) THEN
        RAISE EXCEPTION 'Verify failed: trigger function public.tg_engine_a_validate_inspection() missing';
    END IF;

    SELECT tgenabled INTO v_trigger_enabled
    FROM pg_trigger
    WHERE tgname = 'engine_a_validate_inspection_after_insert'
      AND tgrelid = 'public.inspection_reports'::regclass;

    IF v_trigger_enabled IS NULL THEN
        RAISE EXCEPTION 'Verify failed: trigger engine_a_validate_inspection_after_insert not found on public.inspection_reports';
    END IF;

    IF v_trigger_enabled <> 'O' THEN
        RAISE EXCEPTION 'Verify failed: trigger exists but not enabled (tgenabled=%)', v_trigger_enabled;
    END IF;

    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'Migration 34 verification PASSED';
    RAISE NOTICE '  - tg_engine_a_validate_inspection() function created';
    RAISE NOTICE '  - AFTER INSERT trigger active on public.inspection_reports';
    RAISE NOTICE '  - Every new inspection row will fire Engine A automatically';
    RAISE NOTICE '  - Ready for pgTAP suite against real LA County FOIRs';
    RAISE NOTICE '=========================================================';
END
$verify$;

COMMIT;

-- =============================================================================
-- END MIGRATION 34
-- =============================================================================
