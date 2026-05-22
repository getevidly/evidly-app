-- ══════════════════════════════════════════════════════════════════
-- C19 Phase 2b prerequisite: extend data_source CHECK constraints
-- ══════════════════════════════════════════════════════════════════
-- Adds 'manual_phase2b' and 'manual_jurisdiction_change_2020' to the
-- allowed values for contact_data_source and fire_ahj_data_source.
-- Must run BEFORE 20260522_phase2b_contact_backfill.sql.
--
-- Existing values confirmed via pg_constraint inspection:
--   jsonb_existing, firecrawl_pending_review, verified, unverified
--
-- VERIFY: Run this query BEFORE applying to confirm no missing values:
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'jurisdictions'::regclass
--   AND conname IN ('chk_contact_data_source', 'chk_fire_ahj_data_source');
--
-- Tracker: supabase_migrations.schema_migrations WHERE version = '20260522_extend_data_source_constraint'

-- ── 1. Extend chk_contact_data_source ───────────────────────────
ALTER TABLE jurisdictions DROP CONSTRAINT chk_contact_data_source;

ALTER TABLE jurisdictions ADD CONSTRAINT chk_contact_data_source CHECK (
  contact_data_source IN (
    'jsonb_existing',
    'firecrawl_pending_review',
    'verified',
    'unverified',
    'manual_phase2b',
    'manual_jurisdiction_change_2020'
  )
);

-- ── 2. Extend chk_fire_ahj_data_source ──────────────────────────
ALTER TABLE jurisdictions DROP CONSTRAINT chk_fire_ahj_data_source;

ALTER TABLE jurisdictions ADD CONSTRAINT chk_fire_ahj_data_source CHECK (
  fire_ahj_data_source IN (
    'jsonb_existing',
    'firecrawl_pending_review',
    'verified',
    'unverified',
    'manual_phase2b',
    'manual_jurisdiction_change_2020'
  )
);

-- ── Migration tracker ───────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260522_extend_data_source_constraint')
ON CONFLICT DO NOTHING;
