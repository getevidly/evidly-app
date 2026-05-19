-- =====================================================================
-- Migration: Dashboard v10 — C6 drop user_dashboard_preferences
-- Timestamp: 20260519240000
-- Commit: C6 of Dashboard v10 build sequence
--
-- Drops orphaned v9 table user_dashboard_preferences.
-- Pre-drop: verify 0 rows, no FK dependents.
-- Post-drop: Rule #14 verification.
-- =====================================================================

-- ── Pre-drop verification ────────────────────────────────────────────

DO $$
DECLARE
  _row_count bigint;
  _fk_count  integer;
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_dashboard_preferences'
  ) THEN
    RAISE NOTICE 'user_dashboard_preferences does not exist — nothing to drop';
    RETURN;
  END IF;

  -- Count rows
  EXECUTE 'SELECT count(*) FROM public.user_dashboard_preferences' INTO _row_count;

  -- Count FK dependents pointing TO this table
  SELECT count(*) INTO _fk_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
   AND rc.unique_constraint_schema = ccu.constraint_schema
  WHERE ccu.table_schema = 'public'
    AND ccu.table_name = 'user_dashboard_preferences';

  IF _fk_count > 0 THEN
    RAISE EXCEPTION 'STOP: user_dashboard_preferences has % FK dependent(s) — cannot drop safely', _fk_count;
  END IF;

  RAISE NOTICE 'Pre-drop: % rows, 0 FK dependents — safe to drop', _row_count;
END $$;

-- ── Drop ─────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.user_dashboard_preferences CASCADE;

-- =====================================================================
-- Rule #14 — Apply-time verification block
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_dashboard_preferences'
  ) THEN
    RAISE EXCEPTION 'user_dashboard_preferences still exists after DROP';
  END IF;

  RAISE NOTICE 'PASS user_dashboard_preferences dropped successfully';
END $$;
