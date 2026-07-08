-- ════════════════════════════════════════════════════════════
-- Fire Protection Phase 1 — Migration A
-- Add always_required + counts_toward_coverage to service_type_definitions.
--
-- is_pse already exists (20260829000000). FE already seeded (20260810000023).
-- This migration adds the two missing flag columns and sets values.
--
-- Tracker: supabase_migrations.schema_migrations version = '20260926000000'
-- ════════════════════════════════════════════════════════════

-- ── A. ADD COLUMNS ───────────────────────────────────────────

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS always_required boolean NOT NULL DEFAULT false;

ALTER TABLE service_type_definitions
  ADD COLUMN IF NOT EXISTS counts_toward_coverage boolean NOT NULL DEFAULT false;


-- ── B. UPDATE flags ──────────────────────────────────────────

-- PSE safeguards: is_pse already true; set counts_toward_coverage = true
UPDATE service_type_definitions
SET    counts_toward_coverage = true,
       always_required = false
WHERE  code IN ('KEC', 'FS', 'FA', 'SP');

-- KEC sub-services: all flags false (is_pse already false)
UPDATE service_type_definitions
SET    counts_toward_coverage = false,
       always_required = false
WHERE  code IN ('FPM', 'GFX', 'RGC');

-- FE: always_required = true (universally required regardless of policy)
UPDATE service_type_definitions
SET    always_required = true,
       counts_toward_coverage = false
WHERE  code = 'FE';


-- ── C. Migration tracker ─────────────────────────────────────

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260926000000')
ON CONFLICT DO NOTHING;
