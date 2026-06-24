-- ============================================================
-- Migration: 20260923100000_pse_conditioned_coverages
--
-- Adds conditioned_coverages jsonb column to pl_pse_conditions.
-- Stores the coverage lines (building, BPP, BI) bound to each
-- PSE condition, with extraction confidence per line.
--
-- Shape per element:
--   { "line": "building"|"bpp"|"bi",
--     "amount": "<as written on declarations>",
--     "confidence": <0.0-1.0 or null> }
--
-- Populated by pl-reconcile when joining protective_safeguards
-- applies_to_locations → declarations.locations[].
-- ============================================================

ALTER TABLE public.pl_pse_conditions
  ADD COLUMN IF NOT EXISTS conditioned_coverages jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.pl_pse_conditions.conditioned_coverages IS
  'Coverage lines (building/BPP/BI) bound to this PSE condition, with extraction confidence per line. Shape: [{"line":"building|bpp|bi","amount":"$X","confidence":0.0-1.0}]';

-- ════════════════════════════════════════════════════════════
-- PART B — UB-01-FR-01 template update: coverage-to-condition binding
-- ════════════════════════════════════════════════════════════

-- Update agent_body to include coverage binding + flags.
-- New slots: {building_limit}, {bpp_limit}, {bi_limit},
-- {condition_status_summary}, {pse_notice_48h}, {pse_control_flag}, {pse_scope_flag}
-- §1731 discipline: reads / identifies / flags. Never states that a claim will be
-- paid or denied, never insurance advice, never a treatment/credit/premium determination.
-- Banned: "scored" (use "evaluated"/"documented"), "prevent" (use "reduce").
UPDATE public.pl_finding_templates
SET agent_body = E'This policy''s Protective Safeguard Endorsement (form {pse_form}, symbol {pse_symbol}) conditions coverage on maintaining the cooking-equipment fire-protection systems in working order. The endorsement states: "{pse_desc_plain}"\n\n── Coverage at stake ──\nThe declarations page identifies the following coverage at the locations where this endorsement applies:\n  • Building: {building_limit}\n  • Business Personal Property (BPP): {bpp_limit}\n  • Business Income (BI): {bi_limit}\nThis coverage is conditioned on the {pse_form} protective safeguards being maintained. A lapse in any listed safeguard may impair the coverage identified above.\n\n── Condition status (from EVE evaluation) ──\n{condition_status_summary}\nNote: The condition status above originates from the EVE compliance evaluation, not from Policy Lens''s reading of the policy. Policy Lens identifies what the policy conditions — the EVE evaluation documents whether the safeguard obligations are being met.\n\n── Four protective safeguards relevant to the commercial kitchen ──\n\n1. Kitchen exhaust (hood/duct) cleaning — governed by NFPA 96 (2021). Cleaning must be performed by a qualified person in accordance with the standard, at intervals determined by cooking volume.\n\n2. Fire suppression system — governed by NFPA 17A (2021). Inspection and functional testing must be performed semi-annually by a qualified person trained and certified per the manufacturer''s listed instructions.\n\n3. Automatic sprinkler system — governed by NFPA 25 (2023). Annual inspection must be performed by a qualified person.\n\n4. Fire alarm system — governed by NFPA 72 (2025). Annual testing must be performed by a qualified person trained per the manufacturer''s listed instructions.\n\n── Notification obligation ──\n{pse_notice_48h}\n\nFailure to maintain any listed safeguard as required may void the Protective Safeguard Endorsement and impair coverage.\n\n── Flags ──\n{pse_control_flag}\n{pse_scope_flag}\n\nNote: Portable fire extinguishers (NFPA 10) are not a protective safeguard under the PSE.',
    agent_title = 'Protective Safeguard Endorsement — Coverage Conditioned on Fire Protection ({pse_symbol})'
WHERE signal_id = 'UB-01-FR-01';

-- ── Migration tracker ─────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260923100000')
ON CONFLICT DO NOTHING;
