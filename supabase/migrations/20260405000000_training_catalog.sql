-- Training Catalog
-- Central catalog of all training items (certifications + internal courses)
-- that can be assigned to employees. System items are org-agnostic; orgs can add custom entries.

CREATE TABLE IF NOT EXISTS training_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false,
  required_by TEXT,
  renewal_period_months INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for org-scoped lookups
CREATE INDEX IF NOT EXISTS idx_training_catalog_org ON training_catalog(org_id);
CREATE INDEX IF NOT EXISTS idx_training_catalog_category ON training_catalog(category);

-- RLS
ALTER TABLE training_catalog ENABLE ROW LEVEL SECURITY;

-- Everyone in the org can read their catalog + system items
CREATE POLICY "training_catalog_select" ON training_catalog
  FOR SELECT USING (
    is_system = true
    OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Only owners / admins can insert org-specific items
CREATE POLICY "training_catalog_insert" ON training_catalog
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner_operator', 'executive', 'platform_admin')
    )
  );

-- Only owners / admins can update org-specific items
CREATE POLICY "training_catalog_update" ON training_catalog
  FOR UPDATE USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner_operator', 'executive', 'platform_admin')
    )
  );

-- Seed system-level catalog items
INSERT INTO training_catalog (org_id, name, category, description, is_system, is_required, required_by, renewal_period_months)
VALUES
  (NULL, 'California Food Handler Card', 'food_safety', 'State-mandated food handler certification per CA SB 476. Required within 30 days of hire.', true, true, 'California Health & Safety Code §113948', 36),
  (NULL, 'ServSafe Food Protection Manager', 'food_safety', 'ANSI-accredited CFPM exam. At least one certified manager required per establishment during operating hours.', true, true, 'California Health & Safety Code §113947.1', 60),
  (NULL, 'HACCP Principles Training', 'food_safety', 'Hazard Analysis and Critical Control Points training. Required for specialized processes (juice, seafood).', true, false, 'FDA 21 CFR Part 120/123', NULL),
  (NULL, 'Allergen Awareness Training', 'food_safety', 'Big 9 allergens, cross-contact prevention, and customer communication. Becoming mandatory in many jurisdictions.', true, true, 'FDA Food Code 2-102.11', 24),
  (NULL, 'Fire Extinguisher Training', 'facility_safety', 'Annual portable extinguisher use training — types, PASS technique, and inspection procedures.', true, true, 'OSHA 29 CFR 1910.157 / NFPA 10', 12),
  (NULL, 'Hood Suppression System Awareness', 'facility_safety', 'Manual pull station location, activation procedure, and post-activation steps for commercial hood systems.', true, true, 'NFPA 96', 12),
  (NULL, 'First Aid / CPR Certification', 'workplace_safety', 'Basic first aid and CPR/AED. At least one certified person per shift recommended.', true, false, NULL, 24),
  (NULL, 'Kitchen Facility Safety & Equipment', 'facility_safety', 'Comprehensive facility safety covering fire systems, NFPA 96 compliance, grease fire response, and evacuation.', true, false, NULL, 12),
  (NULL, 'Food Handler Essentials (LMS)', 'food_safety', 'Internal EvidLY LMS course covering hygiene, temps, cross-contamination, cleaning, storage, and allergens.', true, false, NULL, 36),
  (NULL, 'ServSafe Manager Exam Prep (LMS)', 'food_safety', 'Internal EvidLY LMS course for CFPM exam preparation.', true, false, NULL, 60),
  (NULL, 'Compliance Operations (LMS)', 'compliance', 'Internal EvidLY LMS course on daily checklists, temperature logging, corrective actions, and QR Passport.', true, false, NULL, NULL),
  (NULL, 'New Hire Orientation', 'onboarding', 'Covers company policies, kitchen layout, emergency contacts, and first-day procedures.', true, false, NULL, NULL);
