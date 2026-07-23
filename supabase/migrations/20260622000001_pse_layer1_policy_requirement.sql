-- Migration 20260622000000 — PSE Layer 1: policy-requirement representation (CP 04 11)
-- Greenfield. Registry (grounded form yardstick) + condition bindings (Layer-2-populated).
-- Facts only — no credit/filing/eligibility language. No seed here (seed gated on Arthur-confirmed form content).

-- 1) SYMBOL REGISTRY — grounded CP 04 11 P-symbol definitions (analog of pl_standards_registry)
CREATE TABLE public.pl_pse_symbol_registry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_code     text NOT NULL UNIQUE,                  -- 'P-5','P-9',...
  form            text NOT NULL DEFAULT 'CP 04 11',      -- ISO Protective Safeguards Endorsement
  edition         text NOT NULL,                         -- form edition string (Arthur-confirmed)
  citation        text NOT NULL,                         -- citation into the form
  symbol_label    text NOT NULL,                         -- e.g. 'Automatic Sprinkler System'
  pillar          text,                                  -- fire_safety|food_safety|NULL (NULL when schedule-defined)
  is_schedule_defined boolean NOT NULL DEFAULT false,    -- TRUE for catch-all (P-9): meaning comes from schedule text
  requirement     jsonb NOT NULL DEFAULT '{}'::jsonb,    -- {condition, maintained_per_terms, evidence:{...}} grounded in form
  pending_fields  text[] NOT NULL DEFAULT '{}'::text[],  -- un-grounded fields (mirrors pl_standards_registry)
  notes           text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pl_pse_symbol_registry_pillar_chk
    CHECK (pillar IS NULL OR pillar IN ('fire_safety','food_safety'))
);

-- 2) CONDITION BINDINGS — which P-symbols a location's policy carries (Layer-2 write, Layer-3 read)
CREATE TABLE public.pl_pse_conditions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id              uuid NOT NULL REFERENCES public.locations(id),
  carrier_id               uuid NOT NULL REFERENCES public.external_parties(id),
  symbol_code              text NOT NULL REFERENCES public.pl_pse_symbol_registry(symbol_code),
  pillar                   text NOT NULL,                -- resolved per-instance (P-9's pillar known only here)
  requirement_source       text NOT NULL DEFAULT 'policy',
  requirement_version      text,                         -- human/version label (drift_catches symmetry)
  policy_number            text,                         -- declarations ref (NO policies table invented)
  endorsement_effective_date  date,
  endorsement_expiration_date date,
  source_run_id            uuid REFERENCES public.pl_extraction_runs(id),  -- extraction anchor (mirrors pl_findings)
  source_document_id       uuid,                         -- uuid only, no FK (matches pl_findings posture)
  condition_status         text NOT NULL DEFAULT 'active',-- supersession/staleness (the anchor's purpose)
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pl_pse_conditions_pillar_chk  CHECK (pillar IN ('fire_safety','food_safety')),
  CONSTRAINT pl_pse_conditions_reqsrc_chk  CHECK (requirement_source = 'policy'),
  CONSTRAINT pl_pse_conditions_status_chk  CHECK (condition_status IN ('active','superseded','expired'))
);

CREATE INDEX pl_pse_conditions_loc_pillar_symbol_idx          -- Layer-3 read path (mirrors drift_catches idx)
  ON public.pl_pse_conditions (location_id, pillar, symbol_code);
CREATE INDEX pl_pse_conditions_carrier_idx ON public.pl_pse_conditions (carrier_id);  -- RLS perf
CREATE UNIQUE INDEX pl_pse_conditions_active_uniq            -- no dup active binding per (loc,symbol,policy); refinable in L2
  ON public.pl_pse_conditions (location_id, symbol_code, policy_number) WHERE condition_status = 'active';

-- RLS — insurer-facing store
ALTER TABLE public.pl_pse_symbol_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pl_pse_conditions      ENABLE ROW LEVEL SECURITY;

-- Registry: service-role only (no authenticated policy) — disclosure-minimizing default. Open to authenticated later if UI needs symbol display.
-- (Layer-3 matcher reads it server-side via service role.)

-- Conditions: carrier reads only its own book. Single-level EXISTS — flatter/faster than §2.5's nested IN(SELECT IN(SELECT)), same isolation, avoids importing the known perf debt.
CREATE POLICY pl_pse_conditions_select_carrier
  ON public.pl_pse_conditions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.external_party_members epm
    WHERE epm.user_id = auth.uid() AND epm.party_id = pl_pse_conditions.carrier_id
  ));

-- No INSERT/UPDATE policy → service-role writes only (Layer 2 populates; clients never write PSE conditions). Matches engine write discipline.

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260622000000') ON CONFLICT DO NOTHING;
