-- ============================================================
-- Migration: 20260925000000_pl_findings_applicability_state
--
-- Adds applicability_state to pl_findings per Policy Lens
-- Correctness Spec §C1. Four legal states:
--
--   applicable_evidenced   — policy schedules + EvidLY proof on file
--   applicable_unevidenced — policy schedules, no proof (gap)
--   not_applicable         — policy does NOT schedule this symbol
--   unknown                — in scope but scope/edition undetermined
--
-- Scoped denominator (§C2):
--   alignment = applicable_evidenced / (applicable_evidenced + applicable_unevidenced)
--   not_applicable and unknown excluded from BOTH terms.
--
-- NULL = legacy finding (pre-applicability); scored as unevidenced.
-- ============================================================

ALTER TABLE public.pl_findings
  ADD COLUMN IF NOT EXISTS applicability_state text
  CHECK (applicability_state IN (
    'applicable_evidenced',
    'applicable_unevidenced',
    'not_applicable',
    'unknown'
  ));

COMMENT ON COLUMN public.pl_findings.applicability_state IS
  'PSE applicability per Correctness Spec §C1. applicable_evidenced = scheduled + proof. applicable_unevidenced = scheduled, no proof. not_applicable = not scheduled. unknown = undetermined. NULL = legacy.';

-- ── Migration tracker ─────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260925000000')
ON CONFLICT DO NOTHING;
