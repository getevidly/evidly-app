-- =====================================================================
-- Migration: Citations reference table
-- Timestamp: 20260521190000
-- Sprint: Citations Architecture (CA Only)
--
-- Stores regulatory code sections used by briefing templates and
-- jurisdiction methodology bindings. Reference data — not org-scoped.
-- =====================================================================

CREATE TABLE IF NOT EXISTS citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_family text NOT NULL,
  section_number text NOT NULL,
  short_title text NOT NULL,
  full_text text,
  source_url text,
  applies_to_pillar text NOT NULL CHECK (applies_to_pillar IN ('food_safety', 'fire_safety')),
  current_edition_year int,
  effective_date date,
  superseded_by uuid REFERENCES citations(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (code_family, section_number, current_edition_year)
);

-- Indexes
CREATE INDEX citations_code_family_idx ON citations(code_family);
CREATE INDEX citations_pillar_idx ON citations(applies_to_pillar);
CREATE INDEX citations_section_search_idx
  ON citations USING gin(to_tsvector('english', short_title || ' ' || COALESCE(full_text, '')));

-- RLS: SELECT public (reference data), INSERT/UPDATE/DELETE platform_admin only
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY citations_select_public
  ON citations FOR SELECT
  USING (true);

CREATE POLICY citations_insert_admin
  ON citations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'platform_admin'
    )
  );

CREATE POLICY citations_update_admin
  ON citations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'platform_admin'
    )
  );

CREATE POLICY citations_delete_admin
  ON citations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'platform_admin'
    )
  );

-- =====================================================================
-- Apply-time verification block
-- =====================================================================

DO $$
DECLARE
  _missing text[] := ARRAY[]::text[];
BEGIN
  -- Table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'citations'
  ) THEN
    _missing := array_append(_missing, 'TABLE citations');
  END IF;

  -- RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'citations' AND c.relrowsecurity = true
  ) THEN
    _missing := array_append(_missing, 'RLS ON citations');
  END IF;

  -- Unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'citations'
    AND constraint_type = 'UNIQUE'
  ) THEN
    _missing := array_append(_missing, 'UNIQUE constraint on citations');
  END IF;

  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'citations' AND policyname = 'citations_select_public'
  ) THEN
    _missing := array_append(_missing, 'POLICY citations_select_public');
  END IF;

  IF array_length(_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Citations table verification failed. Missing: %', array_to_string(_missing, ', ');
  END IF;

  RAISE NOTICE 'PASS citations — table, 3 indexes, RLS, 4 policies';
END $$;
