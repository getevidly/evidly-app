-- ══════════════════════════════════════════════════════════════
-- Migration: backfill next_action_at + add CHECK constraint
-- Purpose:   Every open (non-terminal) pipeline row must have a
--            next_action_at date. Backfills existing nulls to
--            CURRENT_DATE + 3, then adds a CHECK constraint so
--            the database rejects future violations.
-- ══════════════════════════════════════════════════════════════

-- 1. Backfill: set next_action_at on open rows that are missing it
UPDATE public.sales_pipeline
   SET next_action_at = CURRENT_DATE + 3
 WHERE next_action_at IS NULL
   AND stage NOT IN ('won', 'lost', 'churned');

-- 2. Add the invariant (Postgres has no ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'sales_pipeline_open_needs_next_action'
  ) THEN
    ALTER TABLE public.sales_pipeline
      ADD CONSTRAINT sales_pipeline_open_needs_next_action
      CHECK ( stage IN ('won', 'lost', 'churned') OR next_action_at IS NOT NULL );
  END IF;
END
$$;
