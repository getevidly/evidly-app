-- 20260502164330_food_safety_profile.sql
--
-- Framework-neutral food safety abstraction. Location-keyed profile.
-- No US-specific values seeded here; seed lives in 3c. All operations additive.

BEGIN;

-- ============================================================================
-- regulatory_frameworks (global reference)
-- ============================================================================
CREATE TABLE public.regulatory_frameworks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  name            text NOT NULL,
  region_scope    text NOT NULL,
  version         text,
  effective_date  date,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.regulatory_frameworks IS
  'One row per regulatory regime (FDA Food Code, Codex Alimentarius, EC 852/2004, UK FSA, Canada SFCR, AU-NZ FSANZ, etc.). No values hardcoded; seed in 3c.';
COMMENT ON COLUMN public.regulatory_frameworks.region_scope IS
  'Scope descriptor: national, multi_national, sub_national.';

ALTER TABLE public.regulatory_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read regulatory frameworks"
  ON public.regulatory_frameworks FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- risk_factors (per-framework)
-- ============================================================================
CREATE TABLE public.risk_factors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id  uuid NOT NULL REFERENCES public.regulatory_frameworks(id) ON DELETE CASCADE,
  code          text NOT NULL,
  name          text NOT NULL,
  description   text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework_id, code)
);

CREATE INDEX idx_risk_factors_framework_id ON public.risk_factors(framework_id);

ALTER TABLE public.risk_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read risk factors"
  ON public.risk_factors FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- process_categories (per-framework process taxonomy)
-- ============================================================================
CREATE TABLE public.process_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id  uuid NOT NULL REFERENCES public.regulatory_frameworks(id) ON DELETE CASCADE,
  code          text NOT NULL,
  name          text NOT NULL,
  description   text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework_id, code)
);

CREATE INDEX idx_process_categories_framework_id ON public.process_categories(framework_id);

ALTER TABLE public.process_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read process categories"
  ON public.process_categories FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- process_ccps (CCPs per process category; CCP is Codex-international)
-- ============================================================================
CREATE TABLE public.process_ccps (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_category_id        uuid NOT NULL REFERENCES public.process_categories(id) ON DELETE CASCADE,
  ccp_code                   text NOT NULL,
  ccp_name                   text NOT NULL,
  critical_limit_definition  text,
  monitoring_procedure       text,
  corrective_action          text,
  sort_order                 integer NOT NULL DEFAULT 0,
  is_active                  boolean NOT NULL DEFAULT true,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (process_category_id, ccp_code)
);

CREATE INDEX idx_process_ccps_process_category_id ON public.process_ccps(process_category_id);

COMMENT ON COLUMN public.process_ccps.critical_limit_definition IS
  'Prose definition for inspector report. Operational critical limit values live on operational tables (e.g., temperature_logs.required_min/max).';

ALTER TABLE public.process_ccps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read process ccps"
  ON public.process_ccps FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- specialized_process_types (per-framework, framework-neutral naming)
-- ============================================================================
CREATE TABLE public.specialized_process_types (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id           uuid NOT NULL REFERENCES public.regulatory_frameworks(id) ON DELETE CASCADE,
  code                   text NOT NULL,
  name                   text NOT NULL,
  description            text,
  requires_written_plan  boolean NOT NULL DEFAULT false,
  sort_order             integer NOT NULL DEFAULT 0,
  is_active              boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework_id, code)
);

CREATE INDEX idx_specialized_process_types_framework_id ON public.specialized_process_types(framework_id);

ALTER TABLE public.specialized_process_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read specialized process types"
  ON public.specialized_process_types FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- allergen_lists (per-framework, versioned)
-- ============================================================================
CREATE TABLE public.allergen_lists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    uuid NOT NULL REFERENCES public.regulatory_frameworks(id) ON DELETE CASCADE,
  code            text NOT NULL,
  name            text NOT NULL,
  description     text,
  effective_date  date,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework_id, code)
);

CREATE INDEX idx_allergen_lists_framework_id ON public.allergen_lists(framework_id);

ALTER TABLE public.allergen_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read allergen lists"
  ON public.allergen_lists FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- allergens (members of an allergen list)
-- ============================================================================
CREATE TABLE public.allergens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allergen_list_id  uuid NOT NULL REFERENCES public.allergen_lists(id) ON DELETE CASCADE,
  code              text NOT NULL,
  name              text NOT NULL,
  description       text,
  sort_order        integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (allergen_list_id, code)
);

CREATE INDEX idx_allergens_allergen_list_id ON public.allergens(allergen_list_id);

ALTER TABLE public.allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read allergens"
  ON public.allergens FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- risk_factor_evidence_definitions
-- Maps risk factors to evidence types. Drives vw_inspector_evidence in 3f.
-- evidence_type allowed values (documented, not enforced):
--   'checklist_item','temperature_log','equipment','document',
--   'training_record','incident_log'
-- ============================================================================
CREATE TABLE public.risk_factor_evidence_definitions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_factor_id       uuid NOT NULL REFERENCES public.risk_factors(id) ON DELETE CASCADE,
  evidence_type        text NOT NULL,
  evidence_descriptor  text NOT NULL,
  notes                text,
  sort_order           integer NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rfed_risk_factor_id ON public.risk_factor_evidence_definitions(risk_factor_id);

ALTER TABLE public.risk_factor_evidence_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read risk factor evidence definitions"
  ON public.risk_factor_evidence_definitions FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- location_food_safety_profile (per-location operational profile from wizard)
-- One profile per location. Multi-location orgs (Aramark Yosemite, Cintas,
-- Filta franchises) get one row per location with its own framework via
-- jurisdiction. Wizard in 3d offers "apply to all locations" bulk action.
-- Framework inherited via primary_jurisdiction_id -> jurisdictions.regulatory_framework_id.
-- Operating hours/days/timezone live on locations table (existing).
-- ============================================================================
CREATE TABLE public.location_food_safety_profile (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id                   uuid NOT NULL UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE,
  primary_jurisdiction_id       uuid REFERENCES public.jurisdictions(id) ON DELETE SET NULL,
  active_process_category_ids   uuid[] NOT NULL DEFAULT '{}',
  has_specialized_processes     boolean NOT NULL DEFAULT false,
  specialized_process_type_ids  uuid[] NOT NULL DEFAULT '{}',
  serves_vulnerable_population  boolean NOT NULL DEFAULT false,
  has_allergen_program          boolean NOT NULL DEFAULT false,
  notes                         text,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lfsp_primary_jurisdiction_id ON public.location_food_safety_profile(primary_jurisdiction_id);

COMMENT ON COLUMN public.location_food_safety_profile.active_process_category_ids IS
  'uuid[] of process_categories.id rows. Element-level FK not enforced (Postgres limitation); wizard validates.';
COMMENT ON COLUMN public.location_food_safety_profile.specialized_process_type_ids IS
  'uuid[] of specialized_process_types.id rows. Element-level FK not enforced.';
COMMENT ON COLUMN public.location_food_safety_profile.serves_vulnerable_population IS
  'Framework-neutral: hospitals, nursing homes, K-12, etc. Per-framework definitions live in specialized_process_types.';

ALTER TABLE public.location_food_safety_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view location food safety profiles in their access"
  ON public.location_food_safety_profile FOR SELECT TO authenticated
  USING (location_id IN (SELECT location_id FROM public.user_location_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert location food safety profiles in their access"
  ON public.location_food_safety_profile FOR INSERT TO authenticated
  WITH CHECK (location_id IN (SELECT location_id FROM public.user_location_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can update location food safety profiles in their access"
  ON public.location_food_safety_profile FOR UPDATE TO authenticated
  USING (location_id IN (SELECT location_id FROM public.user_location_access WHERE user_id = auth.uid()))
  WITH CHECK (location_id IN (SELECT location_id FROM public.user_location_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete location food safety profiles in their access"
  ON public.location_food_safety_profile FOR DELETE TO authenticated
  USING (location_id IN (SELECT location_id FROM public.user_location_access WHERE user_id = auth.uid()));

-- ============================================================================
-- jurisdictions: + regulatory_framework_id (nullable; 3c backfills)
-- ============================================================================
ALTER TABLE public.jurisdictions
  ADD COLUMN regulatory_framework_id uuid REFERENCES public.regulatory_frameworks(id) ON DELETE SET NULL;

CREATE INDEX idx_jurisdictions_regulatory_framework_id ON public.jurisdictions(regulatory_framework_id);

COMMENT ON COLUMN public.jurisdictions.regulatory_framework_id IS
  'Framework that governs this jurisdiction. Nullable until 3c backfill completes; promote to NOT NULL in a follow-up migration.';

COMMIT;
