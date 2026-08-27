-- Drift catch closure pointers.
-- seal-corrective-action writes these when a sealed corrective action was
-- spawned from a drift catch, so the flag records which record closed it.
-- Additive only: no CHECK changes, no index, no backfill.

ALTER TABLE public.drift_catches ADD COLUMN IF NOT EXISTS resolving_corrective_action_id uuid REFERENCES public.corrective_actions(id);
ALTER TABLE public.drift_catches ADD COLUMN IF NOT EXISTS resolved_by uuid;
