-- coi_benchmarks — "What's at Risk" baseline exposure config (INTERNAL: COI).
-- DB-backed config, never hardcoded in components. Per segment, per pillar,
-- per loss-line typical range + pillar-grain worst-case ceiling.
-- Seeds EXACTLY ONE placeholder set (casual, is_placeholder=true). Real/other-segment
-- values load from the COI Methodology report in a governed follow-up. Never present as sourced.

CREATE TABLE IF NOT EXISTS coi_benchmarks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar         text NOT NULL CHECK (pillar IN ('food','fire')),
  segment        text NOT NULL CHECK (segment IN (
                   'qsr','fast_casual','casual','fine_dining',
                   'institutional','bar_nightclub','ghost_cloud','solid_fuel')),
  loss_line      text NOT NULL CHECK (loss_line IN (
                   'foodborne_illness','shutdown_reinspection','reputation',
                   'fire_damage_equipment','shutdown_rebuild')),
  typical_low    numeric NOT NULL,
  typical_high   numeric NOT NULL,
  worst_low      numeric NOT NULL,
  worst_high     numeric NOT NULL,
  source_ref     text,
  is_placeholder boolean NOT NULL DEFAULT true,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  version        text NOT NULL DEFAULT 'v1-placeholder',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coi_benchmarks_typical_order CHECK (typical_low <= typical_high),
  CONSTRAINT coi_benchmarks_worst_order   CHECK (worst_low <= worst_high),
  CONSTRAINT coi_benchmarks_unique UNIQUE (segment, pillar, loss_line, version)
);

ALTER TABLE coi_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coi_benchmarks read authenticated" ON coi_benchmarks;
CREATE POLICY "coi_benchmarks read authenticated"
  ON coi_benchmarks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "coi_benchmarks admin write" ON coi_benchmarks;
CREATE POLICY "coi_benchmarks admin write"
  ON coi_benchmarks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin'));

-- PLACEHOLDER SEED — casual dining — is_placeholder=true. Replace with report values. Not sourced.
INSERT INTO coi_benchmarks (pillar, segment, loss_line, typical_low, typical_high, worst_low, worst_high, source_ref, is_placeholder, version) VALUES
  ('food','casual','foodborne_illness',     400, 1800, 250000, 2000000, 'PLACEHOLDER - USDA ERS / CDC NORS / Bartsch (pending report)', true, 'v1-placeholder'),
  ('food','casual','shutdown_reinspection', 300,  900, 250000, 2000000, 'PLACEHOLDER - pending report', true, 'v1-placeholder'),
  ('food','casual','reputation',            200,  800, 250000, 2000000, 'PLACEHOLDER - pending report', true, 'v1-placeholder'),
  ('fire','casual','fire_damage_equipment', 300, 1200, 150000,  500000, 'PLACEHOLDER - NFPA / Campbell / ISO CP 04 11 (pending report)', true, 'v1-placeholder'),
  ('fire','casual','shutdown_rebuild',      200,  900, 150000,  500000, 'PLACEHOLDER - pending report', true, 'v1-placeholder'),
  ('fire','casual','reputation',            100,  500, 150000,  500000, 'PLACEHOLDER - pending report', true, 'v1-placeholder')
ON CONFLICT (segment, pillar, loss_line, version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260705174005') ON CONFLICT (version) DO NOTHING;
