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
  applies_to TEXT[] DEFAULT '{}',
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

-- Seed 22 system-level catalog items for commercial kitchens
INSERT INTO training_catalog (org_id, name, category, description, is_system, is_required, required_by, renewal_period_months, applies_to)
VALUES
  -- Food Safety (10)
  (NULL, 'ServSafe Food Handler Certification', 'food_safety', 'State-mandated food handler certification. Required within 30 days of hire for all food-handling employees.', true, true, 'CalCode §113948', 36, ARRAY['chef','kitchen_staff']),
  (NULL, 'ServSafe Manager Certification (CFPM)', 'food_safety', 'ANSI-accredited Certified Food Protection Manager exam. At least one CFPM required per establishment during all operating hours.', true, true, 'CalCode §113947.5', 60, ARRAY['owner_operator','kitchen_manager','chef']),
  (NULL, 'Allergen Awareness Training', 'food_safety', 'Big 9 allergens identification, cross-contact prevention, and customer communication protocols for allergic reactions.', true, true, 'FDA Food Code §2-102.11', 12, ARRAY['chef','kitchen_staff']),
  (NULL, 'Food Safety Basics — Cross-Contamination Prevention', 'food_safety', 'Proper food handling techniques to prevent cross-contamination between raw and ready-to-eat foods.', true, true, 'CalCode §113996', 12, ARRAY['kitchen_staff']),
  (NULL, 'Proper Handwashing Procedures', 'food_safety', 'Correct handwashing technique, when to wash hands, proper hand sanitizer use, and glove protocols.', true, true, 'CalCode §113953.3', 12, ARRAY['all']),
  (NULL, 'Temperature Control & Danger Zone', 'food_safety', 'Understanding the temperature danger zone (41°F–135°F), proper hot/cold holding, cooling procedures, and thermometer calibration.', true, true, 'CalCode §113996', 12, ARRAY['chef','kitchen_staff']),
  (NULL, 'Receiving & Storage Procedures', 'food_safety', 'Proper receiving inspection, temperature verification at delivery, FIFO rotation, and food storage requirements.', true, false, 'FDA Food Code §3-202', 12, ARRAY['chef','kitchen_staff']),
  (NULL, 'Date Marking & Labeling (Ready-to-Eat Foods)', 'food_safety', 'Proper date marking of ready-to-eat TCS foods held more than 24 hours, including 7-day discard rules.', true, false, 'CalCode §114059', 12, ARRAY['chef','kitchen_staff']),
  (NULL, 'Personal Hygiene & Illness Policy', 'food_safety', 'Employee health policies, reportable illnesses (Big 5), exclusion/restriction criteria, and return-to-work procedures.', true, true, 'CalCode §113949.5', 12, ARRAY['all']),
  (NULL, 'Norovirus & Foodborne Illness Awareness', 'food_safety', 'Understanding norovirus transmission, symptoms, prevention strategies, and proper response to suspected outbreaks.', true, false, 'FDA Food Code §2-201.11', 12, ARRAY['all']),

  -- Facility Safety (7)
  (NULL, 'Fire Extinguisher Use & Training', 'facility_safety', 'Annual portable extinguisher training — types (ABC, K-Class), PASS technique, inspection procedures, and placement requirements.', true, true, 'NFPA 10 §7.1', 12, ARRAY['all']),
  (NULL, 'Kitchen Fire Suppression System Activation', 'facility_safety', 'Manual pull station location, activation procedure, gas shut-off, and post-activation steps for commercial hood suppression systems.', true, true, 'NFPA 96 §12.1', 12, ARRAY['chef','kitchen_staff','kitchen_manager']),
  (NULL, 'Emergency Evacuation Procedures', 'facility_safety', 'Emergency action plan, evacuation routes, assembly points, head counts, and coordination with emergency services.', true, true, 'OSHA 29 CFR 1910.38', 12, ARRAY['all']),
  (NULL, 'Grease Fire Response & K-Class Extinguisher', 'facility_safety', 'Proper response to grease fires, K-Class extinguisher use, why water is never used on grease fires, and hood system activation.', true, true, 'NFPA 10 / NFPA 96', 12, ARRAY['chef','kitchen_staff']),
  (NULL, 'Hazard Communication (HAZCOM) / Chemical Safety', 'facility_safety', 'Safety Data Sheets (SDS), chemical labeling, proper storage and handling of cleaning chemicals, and PPE.', true, true, 'OSHA 29 CFR 1910.1200', 12, ARRAY['all']),
  (NULL, 'Slip, Trip & Fall Prevention', 'facility_safety', 'Wet floor procedures, proper footwear, walkway maintenance, spill cleanup protocols, and hazard reporting.', true, false, 'OSHA General Duty', 12, ARRAY['all']),
  (NULL, 'Burns & Scalds Prevention', 'facility_safety', 'Safe handling of hot surfaces, liquids, and equipment. Proper use of PPE, first aid for burns, and equipment-specific safety protocols.', true, false, 'OSHA General Duty', 12, ARRAY['chef','kitchen_staff']),

  -- Workplace Safety (5)
  (NULL, 'Sexual Harassment Prevention (CA SB 1343)', 'workplace_safety', 'California-mandated sexual harassment prevention training. 2 hours for supervisors, 1 hour for non-supervisory employees.', true, true, 'CA SB 1343 / Gov Code §12950.1', 24, ARRAY['all']),
  (NULL, 'Workplace Violence Prevention (CA SB 553)', 'workplace_safety', 'Workplace violence prevention plan, threat recognition, de-escalation techniques, and incident reporting procedures.', true, true, 'CA SB 553 / Lab Code §6401.9', 12, ARRAY['all']),
  (NULL, 'Workplace Safety Orientation (New Hire)', 'workplace_safety', 'Initial safety orientation covering company policies, emergency procedures, hazard communication, and IIPP.', true, true, 'Cal/OSHA T8 §3203', NULL, ARRAY['all']),
  (NULL, 'Workers'' Compensation Rights & Reporting', 'workplace_safety', 'Employee rights under workers'' compensation, how to report workplace injuries, and employer posting requirements.', true, true, 'CA Lab Code §3550', NULL, ARRAY['all']),
  (NULL, 'Heat Illness Prevention (Outdoor/Hot Environments)', 'workplace_safety', 'Heat illness symptoms, prevention measures, access to water/shade/rest, and emergency response for heat-related conditions.', true, true, 'Cal/OSHA T8 §3395', 12, ARRAY['all']);
