-- ============================================================
-- POLICY LENS INTAKE TABLE — Schema v1.4 (additive)
-- Migration: 20260914000000
-- PL-04: Kitchen address columns (street_address, city, state).
-- zip and county already exist since v1.0.
-- All nullable — existing rows predate address collection.
-- ============================================================

ALTER TABLE public.policy_lens_intakes
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS state          text;

ALTER TABLE public.policy_lens_intakes
  ALTER COLUMN schema_version SET DEFAULT '1.4';

COMMENT ON TABLE public.policy_lens_intakes IS
  'Policy Lens intake landing zone. Schema v1.4 LOCKED. v1.4 adds
  kitchen address columns (street_address, city, state) alongside
  existing zip and county. State uses 2-letter abbreviation (e.g.
  CA) matching the main signup path. Column changes require a
  versioned migration + explicit approval. Rows are never deleted;
  extracted_fields immutable once status=verified.';

-- Version tracked automatically by supabase db push (20260914000002)
