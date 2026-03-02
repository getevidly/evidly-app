-- CORRECTIVE-ACTIONS-1: Corrective Action Templates + Corrective Actions tables
-- Provides 25 system templates with regulatory references and full lifecycle tracking

-- ── Table: corrective_action_templates ────────────────────────
CREATE TABLE IF NOT EXISTS corrective_action_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('food_safety', 'facility_safety', 'operational')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  suggested_root_cause TEXT,
  regulation_reference TEXT,
  recommended_timeframe_days INT DEFAULT 7,
  is_system BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Table: corrective_actions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  template_id UUID REFERENCES corrective_action_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('food_safety', 'facility_safety', 'operational')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'in_progress', 'completed', 'verified', 'closed', 'archived')),
  source TEXT,
  assignee_id UUID,
  assignee_name TEXT,
  root_cause TEXT,
  corrective_steps TEXT,
  preventive_measures TEXT,
  regulation_reference TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  closed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ca_templates_org ON corrective_action_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_ca_templates_category ON corrective_action_templates(category);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_org_status ON corrective_actions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_org_location ON corrective_actions(organization_id, location_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due_date ON corrective_actions(due_date);

-- ── Updated-at triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_corrective_action_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_corrective_action_templates_updated_at
  BEFORE UPDATE ON corrective_action_templates
  FOR EACH ROW EXECUTE FUNCTION update_corrective_action_templates_updated_at();

CREATE OR REPLACE FUNCTION update_corrective_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_corrective_actions_updated_at
  BEFORE UPDATE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION update_corrective_actions_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE corrective_action_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

-- Templates: system templates (org_id IS NULL) readable by all, org templates by org members
CREATE POLICY "templates_select" ON corrective_action_templates
  FOR SELECT USING (organization_id IS NULL OR organization_id = auth.jwt()->>'organization_id'::text::uuid);

CREATE POLICY "templates_insert" ON corrective_action_templates
  FOR INSERT WITH CHECK (organization_id = auth.jwt()->>'organization_id'::text::uuid);

CREATE POLICY "templates_update" ON corrective_action_templates
  FOR UPDATE USING (organization_id = auth.jwt()->>'organization_id'::text::uuid);

-- Corrective actions: org-scoped
CREATE POLICY "ca_select" ON corrective_actions
  FOR SELECT USING (organization_id = auth.jwt()->>'organization_id'::text::uuid);

CREATE POLICY "ca_insert" ON corrective_actions
  FOR INSERT WITH CHECK (organization_id = auth.jwt()->>'organization_id'::text::uuid);

CREATE POLICY "ca_update" ON corrective_actions
  FOR UPDATE USING (organization_id = auth.jwt()->>'organization_id'::text::uuid);

-- Service role bypass
CREATE POLICY "templates_service_all" ON corrective_action_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "ca_service_all" ON corrective_actions
  FOR ALL USING (auth.role() = 'service_role');

-- ── Seed 25 system templates ─────────────────────────────────
INSERT INTO corrective_action_templates (organization_id, title, description, category, severity, suggested_root_cause, regulation_reference, recommended_timeframe_days, is_system) VALUES
-- Food Safety (12)
(NULL, 'Walk-in Cooler Temperature Excursion', 'Walk-in cooler recorded temperature above 41°F limit. Verify door seal, compressor operation, and product temperatures. Discard any TCS foods held above 41°F for more than 4 hours.', 'food_safety', 'critical', 'Door left ajar, compressor failure, or overloading', 'FDA 21 CFR 117.150', 1, true),
(NULL, 'Hot Holding Below Minimum Temperature', 'Hot holding unit recorded below 135°F minimum. Reheat food to 165°F before returning to holding. Check equipment calibration.', 'food_safety', 'critical', 'Equipment malfunction, improper preheating, or lid left open', 'FDA Food Code 3-501.16', 1, true),
(NULL, 'Handwashing Station Non-Compliance', 'Handwashing station found without soap, paper towels, or warm water. Restock immediately and verify all stations.', 'food_safety', 'high', 'Supply not restocked, plumbing issue, or blocked access', 'FDA Food Code 2-301.14', 1, true),
(NULL, 'Cross-Contamination Risk Identified', 'Cross-contamination risk found — raw proteins stored above ready-to-eat foods, shared cutting boards, or improper utensil use.', 'food_safety', 'high', 'Staff not following SOP, inadequate storage organization, or training gap', 'FDA Food Code 3-302.11', 1, true),
(NULL, 'Receiving Log Missing or Incomplete', 'Delivery not logged in receiving log. Temperatures, quantities, and vendor info must be recorded for every delivery.', 'food_safety', 'medium', 'Staff forgot to log, form not available, or delivery during rush', 'FDA Food Code 3-202.11', 3, true),
(NULL, 'Food Handler Card Expired or Missing', 'One or more staff members have expired or missing food handler certifications. Schedule renewal immediately.', 'food_safety', 'high', 'Certification renewal overlooked, new hire not yet certified', 'State Health Code', 7, true),
(NULL, 'Allergen Labeling Deficiency', 'Menu items or prep containers missing required allergen labeling. Update labels and verify staff awareness of major allergens.', 'food_safety', 'high', 'Label not updated after recipe change, missing prep labels', 'FALCPA / FDA Food Code 3-602.11', 2, true),
(NULL, 'HACCP Critical Control Point Deviation', 'Critical control point out of range — CCP monitoring log shows deviation from established limits. Implement corrective action per HACCP plan.', 'food_safety', 'critical', 'Process deviation, monitoring lapse, or equipment failure', '21 CFR 120 / HACCP Plan', 1, true),
(NULL, 'Improper Cooling Procedure', 'Food not cooled from 135°F to 70°F within 2 hours or to 41°F within 6 hours total. Evaluate cooling method and batch sizes.', 'food_safety', 'critical', 'Cooling container too deep, insufficient ice bath, or large batch size', 'FDA Food Code 3-501.14', 1, true),
(NULL, 'Sanitizer Concentration Out of Range', 'Sanitizer test strips show concentration outside acceptable range. Adjust solution and re-test. Verify chemical supplier and dilution ratios.', 'food_safety', 'medium', 'Incorrect dilution ratio, depleted chemical supply, or dispenser malfunction', 'FDA Food Code 4-501.114', 1, true),
(NULL, 'Date Marking / Labeling Missing', 'Ready-to-eat TCS foods in cold storage missing date marks. Label all items with prep date and 7-day discard date.', 'food_safety', 'medium', 'Staff not labeling during prep, labels fell off, or new staff not trained', 'FDA Food Code 3-501.17', 1, true),
(NULL, 'Personal Hygiene Violation', 'Staff observed not following personal hygiene requirements — improper handwashing, eating in prep area, or working while ill.', 'food_safety', 'medium', 'Training gap, supervision lapse, or policy not enforced', 'FDA Food Code 2-301.11', 1, true),
-- Facility Safety (10)
(NULL, 'Fire Suppression System Inspection Overdue', 'Annual fire suppression system inspection certificate has expired. Schedule re-inspection with certified vendor immediately.', 'facility_safety', 'critical', 'Vendor scheduling oversight, expired contract, or vendor unavailability', 'NFPA 96', 3, true),
(NULL, 'Fire Extinguisher Inspection Overdue', 'Monthly visual inspection or annual service inspection for fire extinguisher(s) is overdue. Inspect and tag all units.', 'facility_safety', 'high', 'Inspection schedule not tracked, inspector not available', 'NFPA 10', 7, true),
(NULL, 'Emergency Exit Blocked or Obstructed', 'Emergency exit found blocked by equipment, boxes, or other obstructions. Clear immediately and verify all exit paths.', 'facility_safety', 'critical', 'Storage overflow, delivery staging, or staff unaware of requirement', 'OSHA 29 CFR 1910.37', 1, true),
(NULL, 'Slip/Trip Hazard Identified', 'Wet floor, damaged flooring, loose mats, or cables creating slip/trip hazard. Address immediately and post warning signage.', 'facility_safety', 'high', 'Spill not cleaned, damaged floor tile, or missing floor mat', 'OSHA 29 CFR 1910.22', 1, true),
(NULL, 'Pest Evidence Found', 'Evidence of pest activity (droppings, gnaw marks, live insects) found in food prep or storage area. Contact pest control vendor.', 'facility_safety', 'high', 'Gap in pest exclusion, sanitation issue, or door propped open', 'FDA Food Code 6-501.111', 2, true),
(NULL, 'Hood Cleaning Certificate Expired', 'Kitchen exhaust hood cleaning certificate has expired. Schedule cleaning with certified vendor per NFPA 96 frequency requirements.', 'facility_safety', 'high', 'Cleaning schedule not tracked, vendor contract lapsed', 'NFPA 96', 7, true),
(NULL, 'Grease Trap Maintenance Overdue', 'Grease trap / interceptor maintenance is past due. Schedule pumping and cleaning per local code requirements.', 'facility_safety', 'medium', 'Maintenance schedule not tracked, vendor scheduling issue', 'Local plumbing code', 7, true),
(NULL, 'Lighting Deficiency in Prep Area', 'Lighting in food prep, cooking, or warewashing area below minimum required foot-candles. Replace bulbs or fixtures.', 'facility_safety', 'medium', 'Burned out bulbs, broken fixture, or shield missing', 'FDA Food Code 6-303.11', 3, true),
(NULL, 'Ventilation System Not Operating', 'Kitchen ventilation / exhaust system not operating properly. Check fan belts, filters, and motor. Ensure make-up air is adequate.', 'facility_safety', 'high', 'Fan motor failure, clogged filters, or electrical issue', 'OSHA / Local building code', 2, true),
(NULL, 'First Aid Kit Missing or Incomplete', 'First aid kit not present or missing required supplies. Restock and verify contents meet OSHA requirements.', 'facility_safety', 'low', 'Supplies used and not restocked, kit relocated', 'OSHA 29 CFR 1910.151', 7, true),
-- Operational (3)
(NULL, 'Pest Control Service Overdue', 'Scheduled pest control service visit is overdue. Contact vendor to reschedule. Verify service frequency meets requirements.', 'operational', 'medium', 'Vendor scheduling conflict, contract renewal pending', 'Vendor SLA / FDA Food Code', 3, true),
(NULL, 'Equipment Calibration Overdue', 'Thermometer or other measuring equipment calibration is overdue. Calibrate using ice-point or boiling-point method and document.', 'operational', 'medium', 'Calibration schedule not maintained, thermometer damaged', 'FDA Food Code 4-502.11', 7, true),
(NULL, 'Training Documentation Gap', 'Required training records missing or incomplete for one or more employees. Update training log and schedule any needed sessions.', 'operational', 'low', 'New hire onboarding incomplete, records not filed after training', 'FDA Food Code 2-103.11', 14, true);
