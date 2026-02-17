-- FS-3: Training & Certificates Module — certification_requirements + training_records
-- Adds facility-level certification requirements (seeded with CA defaults)
-- and a simplified training_records table for compliance scoring.

-- ══════════════════════════════════════════════════════════════
-- 1. certification_requirements
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS certification_requirements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  cert_type       text NOT NULL,
  cert_name       text NOT NULL,
  required        boolean NOT NULL DEFAULT true,
  required_for_roles text[] NOT NULL DEFAULT '{}',
  deadline_days   integer,
  authority       text NOT NULL,
  authority_section text,
  renewal_period_months integer,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE certification_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org requirements"
  ON certification_requirements FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage their org requirements"
  ON certification_requirements FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- ══════════════════════════════════════════════════════════════
-- 2. training_records (simplified compliance view)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     uuid REFERENCES facilities(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  training_type   text NOT NULL,
  training_name   text NOT NULL,
  description     text,
  completed_date  date,
  trainer         text,
  duration_minutes integer,
  document_url    text,
  score           integer,
  pass_fail       text,
  next_due_date   date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org training records"
  ON training_records FOR SELECT
  USING (
    facility_id IN (
      SELECT f.id FROM facilities f
      JOIN user_profiles up ON up.organization_id = f.organization_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage training records"
  ON training_records FOR ALL
  USING (
    facility_id IN (
      SELECT f.id FROM facilities f
      JOIN user_profiles up ON up.organization_id = f.organization_id
      WHERE up.id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 3. Seed California default certification requirements
-- ══════════════════════════════════════════════════════════════

INSERT INTO certification_requirements (organization_id, cert_type, cert_name, required, required_for_roles, deadline_days, authority, authority_section, renewal_period_months, notes)
VALUES
  (NULL, 'food_handler',              'California Food Handler Card',           true,  '{kitchen,kitchen_manager}',                   30, 'California Health & Safety Code', '§113948',   36, 'All food handlers must obtain within 30 days of hire (SB 476). Valid for 3 years.'),
  (NULL, 'cfpm',                      'Certified Food Protection Manager',      true,  '{kitchen_manager,management}',                NULL, 'California Health & Safety Code', '§113947.1', 60, 'At least one CFPM required per establishment during all operating hours. Accepted: ServSafe, National Registry, Prometric.'),
  (NULL, 'fire_extinguisher_training','Fire Extinguisher Training',             true,  '{kitchen,kitchen_manager,facilities}',         NULL, 'OSHA 29 CFR 1910.157 / NFPA 10', NULL,         12, 'Annual training on portable extinguisher use required for all employees.'),
  (NULL, 'hood_safety',              'Hood Suppression System Awareness',      true,  '{kitchen,kitchen_manager}',                   NULL, 'NFPA 96 / EvidLY Best Practice',  NULL,         12, 'Kitchen staff must know manual pull station location and activation procedure.'),
  (NULL, 'allergen_awareness',       'Allergen Awareness Training',            true,  '{kitchen,kitchen_manager}',                   NULL, 'FDA Food Code 2-102.11',          NULL,         24, 'Recommended; becoming mandatory in many jurisdictions. Covers Big 9 allergens.'),
  (NULL, 'first_aid_cpr',            'First Aid / CPR Certification',          false, '{kitchen_manager,management,facilities}',      NULL, 'EvidLY Best Practice',            NULL,         24, 'At least one certified per shift recommended. Not legally required in CA for food service.'),
  (NULL, 'haccp_training',           'HACCP Training',                         false, '{kitchen_manager,management}',                NULL, 'FDA 21 CFR Part 120/123',         NULL,         NULL, 'Required for staff involved in specialized processes (juice, seafood). Renewal per facility policy.');
