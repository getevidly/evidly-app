-- ============================================================
-- Migration: 20260923000000_standards_pse_templates_verified
--
-- Arthur-approved 2026-06-23. Single migration containing:
--
--   PART A — pl_standards_registry updates
--     A1. Sprinkler top-level: edition → "2023", citation polished,
--         citation_detail simplified (unverified sections stripped)
--     A2. Sprinkler JSONB: 8 stale/unverified embedded fields
--         (Flag 5 + full-text pass — confirmed in PROD diagnostic)
--     A3. enforced_by on hood_cleaning, suppression, sprinkler,
--         fire_alarm (enforced_by ONLY on fire_alarm)
--     A4. INSERT extinguisher: NFPA 10, 2022
--
--   PART B — pl_pse_symbol_registry
--     B1. 48-hour notification language on P-1/P-2/P-5/P-9
--
--   PART C — pl_finding_templates (new)
--     C1. UB-01-FR-01 — PSE suspension on cooking equipment
--     C2. UB-03-FS-06 — multi-location spoilage
--
--   PART D — pl_finding_templates (enrichments)
--     D1–D4. Add who + AHJ to correlation.expects
--     D5. UB-01-FR-02 — append 48-hour notification to agent_body
--
-- NOT changed:
--   fire_alarm edition (stays 2025 — verified against 2025 CFC Ch.80)
--   sprinkler state.US-CA.frequency (PENDING_AHJ_WRITTEN_CONFIRM)
--   NFPA 96 edition 2021, NFPA 17A edition 2021 (verified correct)
--   sprinkler requirement.national.who.value (null; approved as-is)
--
-- STRIPPED in A2 (unverified section refs in JSONB cite fields):
--   state.US-CA.edition_ref.cite         → "incorporated by reference per 2025 CFC"
--   state.US-CA.retention.cite           → "2025 CFC retention requirement"
--   state.US-CA.cooking_protection.cite  → "2025 CFC commercial cooking protection requirement"
--
-- LEFT (pending context, not stripped):
--   state.US-CA.frequency.cite  = "19 CCR §904(a)(1) — ..."
--     (entire frequency dimension is PENDING_AHJ_WRITTEN_CONFIRM)
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART A — pl_standards_registry
-- ════════════════════════════════════════════════════════════

-- A1: Sprinkler top-level columns
--   edition: "2013 California Edition (based on NFPA 25, 2011 ed.)" → "2023"
--   citation: polished per Arthur (no invented section numbers)
--   citation_detail: general accurate version (substantive facts preserved in JSONB)
UPDATE public.pl_standards_registry
SET edition         = '2023',
    citation        = 'NFPA 25 (2023), incorporated by reference per 2025 CFC',
    citation_detail = 'Standard for the Inspection, Testing, and Maintenance of Water-Based Fire Protection Systems, 2023 edition. Covers sprinkler system inspection schedules including commercial cooking equipment nozzle inspection.',
    updated_at      = now()
WHERE topic = 'sprinkler';

-- A2: Sprinkler JSONB — 8 stale/unverified embedded fields
--   All confirmed present in PROD via pre-migration diagnostic + full-text pass.
--   Chained jsonb_set to update all in one pass:
--     1. national.edition:               "2011" → "2023"
--     2. state.US-CA.edition:            old → "2025 CFC; NFPA 25, 2023 edition"
--     3. state.US-CA.edition_ref.value:  old → "NFPA 25, 2023 edition, incorporated by reference"
--     4. state.US-CA.edition_ref.cite:   "19 CCR §904(a)(1); CFC Table 901.6.1" → general
--     5. state.US-CA.retention.cite:     "19 CCR §904.2(c)" → general
--     6. state.US-CA.cooking_protection.cite: "CFC §904.13.4, §904.13.4.1" → general
--     7. national.who.cite:              "NFPA 25 (2013 CA Ed.) base" → "NFPA 25 (2023)"
--     8. national.retention.cite:        "NFPA 25 (2013 CA Ed.) base" → "NFPA 25 (2023)"
--
--   NOT touched (correct / pending):
--     national.frequency.cite  — verified §5.2.1.1/§5.4.1.7
--     state.US-CA.frequency.*  — PENDING_AHJ_WRITTEN_CONFIRM (cite is part of pending context)
--     state.US-CA.retention.value — substantive, leave as-is
--     state.US-CA.cooking_protection.value — substantive, leave as-is
UPDATE public.pl_standards_registry
SET requirement = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    requirement,
                    '{national,edition}',
                    '"2023"'::jsonb
                  ),
                  '{state,US-CA,edition}',
                  '"2025 CFC; NFPA 25, 2023 edition"'::jsonb
                ),
                '{state,US-CA,edition_ref,value}',
                '"NFPA 25, 2023 edition, incorporated by reference"'::jsonb
              ),
              '{state,US-CA,edition_ref,cite}',
              '"incorporated by reference per 2025 CFC"'::jsonb
            ),
            '{state,US-CA,retention,cite}',
            '"2025 CFC retention requirement"'::jsonb
          ),
          '{state,US-CA,cooking_protection,cite}',
          '"2025 CFC commercial cooking protection requirement"'::jsonb
        ),
        '{national,who,cite}',
        '"NFPA 25 (2023)"'::jsonb
      ),
      '{national,retention,cite}',
      '"NFPA 25 (2023)"'::jsonb
    ),
    updated_at = now()
WHERE topic = 'sprinkler';

-- A3: enforced_by on four topics (fire_alarm: enforced_by ONLY, edition untouched)
UPDATE public.pl_standards_registry
SET enforced_by = '2025 California Fire Code (2024 IFC base), Title 24 Part 9',
    updated_at  = now()
WHERE topic IN ('hood_cleaning', 'suppression', 'sprinkler', 'fire_alarm');

-- A4: INSERT extinguisher row — NFPA 10, edition 2022
INSERT INTO public.pl_standards_registry
  (topic, standard, edition, citation, enforced_by, requirement, pending_fields, citation_detail)
VALUES (
  'extinguisher',
  'NFPA 10',
  '2022',
  'NFPA 10 (2022), incorporated by reference per 2025 CFC',
  '2025 California Fire Code (2024 IFC base), Title 24 Part 9',
  '{}'::jsonb,
  ARRAY['requirement']::text[],
  'Standard for Portable Fire Extinguishers, 2022 edition.'
)
ON CONFLICT (topic) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- PART B — pl_pse_symbol_registry
-- ════════════════════════════════════════════════════════════

-- B1: 48-hour notification language — maintained_per_terms[2]
--   Old: "Notify the insurer of any known suspension of or
--         impairment in any protective safeguard listed in the Schedule."
--   New: defers to policy's stated window (commonly 48 hours)
UPDATE public.pl_pse_symbol_registry
SET requirement = jsonb_set(
      requirement,
      '{maintained_per_terms,2}',
      '"Notify the insurer within the time the policy requires (commonly 48 hours) of any known suspension of or impairment to any protective safeguard listed in the Schedule."'::jsonb
    ),
    updated_at = now()
WHERE symbol_code IN ('P-1', 'P-2', 'P-5', 'P-9');


-- ════════════════════════════════════════════════════════════
-- PART C — pl_finding_templates (new templates)
-- ════════════════════════════════════════════════════════════

-- C1: UB-01-FR-01 — PSE suspension on cooking equipment (CRITICAL)
--   Covers four safeguards, 48-hour notice, who+AHJ in correlation.
--   Form pulled from {pse_form} slot (supports both CP 04 11 and BP 04 30).
--   NFPA 72 resolved to 2025. Extinguisher excluded as not-a-safeguard.
INSERT INTO public.pl_finding_templates
  (signal_id, finding_key, part, default_flag, trigger_condition,
   agent_title, agent_body, agent_refs,
   kitchen_title, kitchen_body,
   correlation, citation_verified, severity)
VALUES (
  'UB-01-FR-01',
  'pse_suspension_cooking',
  'fire',
  'high',
  'Protective safeguard mentions suppression/cooking/hood/duct AND suspension_wording_present = true',
  -- agent_title
  'Protective Safeguard Endorsement — Suspension Risk on Cooking Equipment ({pse_symbol})',
  -- agent_body (E-string for newlines; apostrophes escaped as '')
  E'This policy''s Protective Safeguard Endorsement (form {pse_form}, symbol {pse_symbol}) conditions coverage on maintaining the cooking-equipment fire-protection systems in working order. The endorsement states: "{pse_desc_plain}"\n\nFour protective safeguards are relevant to the commercial kitchen:\n\n1. Kitchen exhaust (hood/duct) cleaning \u2014 governed by NFPA 96 (2021). Cleaning must be performed by a qualified person in accordance with the standard, at intervals determined by cooking volume.\n\n2. Fire suppression system \u2014 governed by NFPA 17A (2021). Inspection and functional testing must be performed semi-annually by a qualified person trained and certified per the manufacturer''s listed instructions.\n\n3. Automatic sprinkler system \u2014 governed by NFPA 25 (2023). Annual inspection must be performed by a qualified person.\n\n4. Fire alarm system \u2014 governed by NFPA 72 (2025). Annual testing must be performed by a qualified person trained per the manufacturer''s listed instructions.\n\nIf any listed safeguard goes out of service, the insured must notify the insurer within the time the policy requires (commonly 48 hours). Failure to maintain any listed safeguard as required may void the Protective Safeguard Endorsement and impair coverage.\n\nNote: Portable fire extinguishers (NFPA 10) are not a protective safeguard under the PSE.',
  -- agent_refs
  '{pse_form} ({pse_symbol}); NFPA 96 (2021); NFPA 17A (2021); NFPA 25 (2023); NFPA 72 (2025); 2025 California Fire Code (2024 IFC base), Title 24 Part 9',
  -- kitchen_title
  'Fire Protection Systems — Maintenance Requirement ({pse_symbol})',
  -- kitchen_body
  E'Your insurance policy requires that the cooking-equipment fire-protection systems listed in the Protective Safeguard Endorsement remain in working order. These include exhaust/hood cleaning, the fire suppression system, the sprinkler system, and the fire alarm. Each must be serviced on schedule by a qualified person. If any system goes out of service, notify your insurer within the time your policy requires.',
  -- correlation
  '{"expects": [{"system": "hood_cleaning", "who": "Qualified person per NFPA 96", "obligation": "Clean kitchen exhaust system at intervals per NFPA 96 / CFC cooking-volume schedule", "ahj_acceptance": "AHJ may require written documentation of cleaning"}, {"system": "suppression", "who": "Qualified person trained and certified per the manufacturer''s listed instructions (NFPA 17A)", "obligation": "Inspect and test wet chemical extinguishing system semi-annually", "ahj_acceptance": "AHJ may require proof of technician qualification and manufacturer training"}, {"system": "sprinkler", "who": "Qualified person per NFPA 25", "obligation": "Annual sprinkler inspection; commercial cooking nozzle inspection per NFPA 25", "ahj_acceptance": "AHJ may require documentation of inspection"}, {"system": "fire_alarm", "who": "Qualified person trained per the manufacturer''s listed instructions (NFPA 72)", "obligation": "Annual fire alarm system testing", "ahj_acceptance": "AHJ may require proof of technician qualification and manufacturer training"}], "notification": "Insured must notify insurer within the policy''s stated window (commonly 48 hours) of any out-of-service safeguard", "pse_form": "{pse_form}", "pse_symbol": "{pse_symbol}", "extinguisher_excluded": true}'::jsonb,
  -- citation_verified
  'NFPA 96 (2021), NFPA 17A (2021), NFPA 25 (2023), NFPA 72 (2025)',
  -- severity
  'high'
)
ON CONFLICT (signal_id) DO NOTHING;

-- C2: UB-03-FS-06 — multi-location spoilage
INSERT INTO public.pl_finding_templates
  (signal_id, finding_key, part, default_flag, trigger_condition,
   agent_title, agent_body, agent_refs,
   kitchen_title, kitchen_body,
   correlation, citation_verified, severity)
VALUES (
  'UB-03-FS-06',
  'spoilage_sublimit_multi',
  'food',
  'elevated',
  'Food finding with topic=spoilage AND sublimit_amount present',
  -- agent_title
  'Spoilage Sublimit — {spoilage_limit}{spoilage_scope}',
  -- agent_body
  E'This policy sets a spoilage sublimit of {spoilage_limit}{spoilage_scope}. {temp_log_note}\n\nFor a multi-location account, verify with the carrier whether the sublimit applies per location or as an aggregate across all scheduled locations. The adequacy of this sublimit depends on the total perishable inventory at risk across all sites.\n\nIf temperature monitoring logs are required as a condition of spoilage coverage, ensure each location maintains compliant records.',
  -- agent_refs
  'Policy specimen — spoilage sublimit schedule',
  -- kitchen_title
  'Spoilage Coverage — Sublimit Review',
  -- kitchen_body
  E'Your insurance provides spoilage coverage up to {spoilage_limit}{spoilage_scope}. If you have multiple locations, this limit may be shared across all of them. Review with your agent whether this amount covers your total refrigerated and frozen inventory. {temp_log_note}',
  -- correlation
  '{"expects": [], "spoilage_limit": "{spoilage_limit}", "multi_location": true, "flags": ["Cannot determine from specimen whether sublimit is per-location or aggregate — carrier confirmation required"]}'::jsonb,
  -- citation_verified
  NULL,
  -- severity
  'elevated'
)
ON CONFLICT (signal_id) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- PART D — pl_finding_templates (enrichments)
-- ════════════════════════════════════════════════════════════

-- D1: FR-04-FR-05 — suppression: add who + AHJ to correlation.expects
UPDATE public.pl_finding_templates
SET correlation = jsonb_set(
      COALESCE(correlation, '{}'::jsonb),
      '{expects}',
      COALESCE(correlation->'expects', '[]'::jsonb) || '[{"system": "suppression", "who": "Qualified person trained and certified per the manufacturer''s listed instructions (NFPA 17A)", "obligation": "Semi-annual inspection and functional testing of wet chemical extinguishing system", "ahj_acceptance": "AHJ may require proof of technician qualification and manufacturer training documentation"}]'::jsonb,
      true
    )
WHERE signal_id = 'FR-04-FR-05';

-- D2: FR-CLEAN-WARRANTY — hood cleaning: add who + AHJ
UPDATE public.pl_finding_templates
SET correlation = jsonb_set(
      COALESCE(correlation, '{}'::jsonb),
      '{expects}',
      COALESCE(correlation->'expects', '[]'::jsonb) || '[{"system": "hood_cleaning", "who": "Qualified person per NFPA 96", "obligation": "Clean kitchen exhaust system at intervals per NFPA 96 / CFC cooking-volume schedule; retain Certificate of Performance", "ahj_acceptance": "AHJ may require cleaning certificates on file"}]'::jsonb,
      true
    )
WHERE signal_id = 'FR-CLEAN-WARRANTY';

-- D3: FR-18-SAT — sprinkler: add who + AHJ
UPDATE public.pl_finding_templates
SET correlation = jsonb_set(
      COALESCE(correlation, '{}'::jsonb),
      '{expects}',
      COALESCE(correlation->'expects', '[]'::jsonb) || '[{"system": "sprinkler", "who": "Qualified person per NFPA 25", "obligation": "Annual sprinkler inspection; commercial cooking nozzle inspection per NFPA 25", "ahj_acceptance": "AHJ may require inspection documentation on file"}]'::jsonb,
      true
    )
WHERE signal_id = 'FR-18-SAT';

-- D4: FR-08 — hood cleaning NFPA 96: add who + AHJ
UPDATE public.pl_finding_templates
SET correlation = jsonb_set(
      COALESCE(correlation, '{}'::jsonb),
      '{expects}',
      COALESCE(correlation->'expects', '[]'::jsonb) || '[{"system": "hood_cleaning", "who": "Qualified person per NFPA 96", "obligation": "Clean kitchen exhaust system per NFPA 96 Table 12.4 cooking-volume schedule", "ahj_acceptance": "AHJ may require cleaning frequency documentation"}]'::jsonb,
      true
    )
WHERE signal_id = 'FR-08';

-- D5: UB-01-FR-02 — append 48-hour notification to agent_body
UPDATE public.pl_finding_templates
SET agent_body = agent_body || E'\n\nIf any listed safeguard goes out of service, the insured must notify the insurer within the time the policy requires (commonly 48 hours) of any known suspension of or impairment to any protective safeguard listed in the Schedule.'
WHERE signal_id = 'UB-01-FR-02';


-- ── Migration tracker ─────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260923000000')
ON CONFLICT DO NOTHING;
