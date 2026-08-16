-- ══════════════════════════════════════════════════════════════
-- Migration: add next_action_at date column to sales_pipeline
-- Purpose:   Stores the date of the next planned follow-up action
--            for a prospect. Partial index on non-null values only.
-- Note:      Does NOT touch existing next_action column.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.sales_pipeline
  ADD COLUMN IF NOT EXISTS next_action_at DATE;

CREATE INDEX IF NOT EXISTS idx_sales_pipeline_next_action_at
  ON public.sales_pipeline (next_action_at)
  WHERE next_action_at IS NOT NULL;
