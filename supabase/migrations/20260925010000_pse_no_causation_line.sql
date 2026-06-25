-- ============================================================
-- Migration: 20260925010000_pse_no_causation_line
--
-- Prepends the no-causation fact ({no_causation} slot) to
-- three PSE finding templates per Correctness Spec §6:
--
--   UB-01-FR-01 — PSE suspension on cooking equipment
--   UB-01-FR-02 — safeguard presence not scheduled
--   FR-18-SAT   — sprinkler / P-1 safeguard
--
-- The {no_causation} slot is filled at runtime by buildPseSlots
-- in pl-build-findings with the verifiable legal fact that the
-- endorsement is a condition of coverage, not a causation
-- requirement.
-- ============================================================

-- UB-01-FR-01: prepend {no_causation} to agent_body
UPDATE public.pl_finding_templates
SET agent_body = E'{no_causation}\n\n' || agent_body
WHERE signal_id = 'UB-01-FR-01';

-- UB-01-FR-02: prepend {no_causation} to agent_body
UPDATE public.pl_finding_templates
SET agent_body = E'{no_causation}\n\n' || agent_body
WHERE signal_id = 'UB-01-FR-02';

-- FR-18-SAT: prepend {no_causation} to agent_body
UPDATE public.pl_finding_templates
SET agent_body = E'{no_causation}\n\n' || agent_body
WHERE signal_id = 'FR-18-SAT';

-- ── Migration tracker ─────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260925010000')
ON CONFLICT DO NOTHING;
