-- Migration 20260622010000 — PSE Layer 1 seed: CP 04 11 kitchen-relevant P-symbols
-- Grounded in ISO CP 04 11 09 17 (© 2016). Facts only — no credit/filing/eligibility.
-- Selectors are Arthur-confirmed from service_type_definitions:
--   KEC = hood/cooking-equipment exhaust (children GFX/FPM/RGC); FS = Ansul/suppression;
--   FA = fire alarm; SP = sprinkler. FE (extinguishers) is NOT a PSE system (Arthur, locked).

INSERT INTO public.pl_pse_symbol_registry
  (symbol_code, form, edition, citation, symbol_label, pillar, is_schedule_defined, requirement, pending_fields, notes)
VALUES
  ('P-1', 'CP 04 11', '09 17', 'ISO CP 04 11 09 17 Schedule, Symbol P-1',
   'Automatic Sprinkler System', 'fire_safety', false,
   '{
      "condition": "Automatic Sprinkler System, including related supervisory services, maintained as a condition of coverage.",
      "maintained_per_terms": [
        "Maintain the protective safeguards listed in the Schedule, and over which you have control, in complete working order.",
        "Actively engage and maintain in the on position at all times any automatic fire alarm or other automatic system listed in the Schedule.",
        "Notify the insurer of any known suspension of or impairment in any protective safeguard listed in the Schedule."
      ],
      "evidence": { "satisfied_by_codes": ["SP"] }
    }'::jsonb,
   '{}'::text[],
   'P-1 maps to sprinkler (service_type_code SP). Building-level; present only where the kitchen premises is sprinklered.'),

  ('P-2', 'CP 04 11', '09 17', 'ISO CP 04 11 09 17 Schedule, Symbol P-2',
   'Automatic Fire Alarm', 'fire_safety', false,
   '{
      "condition": "Automatic Fire Alarm (monitored / reporting to a public or private fire alarm station) maintained as a condition of coverage.",
      "maintained_per_terms": [
        "Maintain the protective safeguards listed in the Schedule, and over which you have control, in complete working order.",
        "Actively engage and maintain in the on position at all times any automatic fire alarm or other automatic system listed in the Schedule.",
        "Notify the insurer of any known suspension of or impairment in any protective safeguard listed in the Schedule."
      ],
      "evidence": { "satisfied_by_codes": ["FA"] }
    }'::jsonb,
   '{}'::text[],
   'P-2 maps to fire alarm (service_type_code FA).'),

  ('P-5', 'CP 04 11', '09 17', 'ISO CP 04 11 09 17 Schedule, Symbol P-5',
   'Automatic Commercial Cooking Exhaust and Extinguishing System', 'fire_safety', false,
   '{
      "condition": "Automatic Commercial Cooking Exhaust and Extinguishing System maintained as a condition of coverage. The symbol bundles both the cooking-equipment exhaust (hood/duct) and the extinguishing (suppression) sides.",
      "maintained_per_terms": [
        "Maintain the protective safeguards listed in the Schedule, and over which you have control, in complete working order.",
        "Actively engage and maintain in the on position at all times any automatic fire alarm or other automatic system listed in the Schedule.",
        "Notify the insurer of any known suspension of or impairment in any protective safeguard listed in the Schedule."
      ],
      "evidence": { "satisfied_by_codes": ["KEC","FS"], "selector_note": "KEC (exhaust/cooking-equipment, children GFX/FPM/RGC) AND FS (suppression). The single ISO symbol spans two EvidLY evidence codes; Layer 3 resolves how both legs satisfy it." }
    }'::jsonb,
   '{}'::text[],
   'P-5 is the primary commercial-kitchen PSE symbol. Spans KEC + FS in the EvidLY evidence model. SP/FE deliberately excluded (SP is P-1; FE extinguishers are not a PSE system).'),

  ('P-9', 'CP 04 11', '09 17', 'ISO CP 04 11 09 17 Schedule, Symbol P-9',
   'Any Other Specifically Described Protective System', NULL, true,
   '{
      "condition": "Any other specifically described protective system, as described in the policy Schedule or Declarations. Meaning is carrier-customized per policy; the specific system and its pillar are resolved from the schedule text at extraction time.",
      "maintained_per_terms": [
        "Maintain the protective safeguards listed in the Schedule, and over which you have control, in complete working order.",
        "Actively engage and maintain in the on position at all times any automatic fire alarm or other automatic system listed in the Schedule.",
        "Notify the insurer of any known suspension of or impairment in any protective safeguard listed in the Schedule."
      ],
      "evidence": { "satisfied_by_codes": [], "selector_note": "Schedule-defined. Evidence selector and pillar are populated per-instance at Layer 2 from the policy schedule text (e.g. a carrier writing P-9 for a specifically described suppression system)." }
    }'::jsonb,
   ARRAY['pillar','evidence.satisfied_by_codes']::text[],
   'P-9 is the catch-all. pillar NULL and satisfied_by_codes empty by design — both resolved per-policy at extraction (Layer 2), flagged in pending_fields until then.')
ON CONFLICT (symbol_code) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260622010000') ON CONFLICT DO NOTHING;
