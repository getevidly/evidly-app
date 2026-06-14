-- Add started_at timestamp to pl_extraction_runs for orphan detection.
-- A run with started_at IS NOT NULL and status='pending' for >30 min is orphaned.
ALTER TABLE public.pl_extraction_runs
  ADD COLUMN IF NOT EXISTS started_at timestamptz;
