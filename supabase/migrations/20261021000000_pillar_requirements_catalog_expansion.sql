-- Phase 1: Expand onboarding_pillar_requirements into the canonical
-- requirements catalog.  Additive only — no renames.
--
-- Adds:
--   4 columns  (is_conditional, conditional_reason, scope, counts_toward_total)
--   2 pillar values (business_records, vendor_business)
--   25 new CA rows (11 food_safety, 8 business_records, 6 vendor_business)
--   Replaces 1 old row (temperature_logs → 5 itemized temp rows)
--   Updates 3 existing rows (haccp_plan, ahj_inspection, pest_control sort)
--
-- Final: 36 rows, 29 counting.
--   fire 6 / 5 counting · food 16 / 13 · business 8 / 6 · vendor 6 / 5
--   Per-kitchen denominator = 18 (fire 5 + food 13)

-- ── 1. ADD COLUMNS ──────────────────────────────────────────────────

ALTER TABLE onboarding_pillar_requirements
  ADD COLUMN IF NOT EXISTS is_conditional BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE onboarding_pillar_requirements
  ADD COLUMN IF NOT EXISTS conditional_reason TEXT;

ALTER TABLE onboarding_pillar_requirements
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'location';

ALTER TABLE onboarding_pillar_requirements
  ADD COLUMN IF NOT EXISTS counts_toward_total BOOLEAN NOT NULL DEFAULT true;

-- scope CHECK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'opr_scope_check'
      AND conrelid = 'onboarding_pillar_requirements'::regclass
  ) THEN
    ALTER TABLE onboarding_pillar_requirements
      ADD CONSTRAINT opr_scope_check CHECK (scope IN ('location', 'vendor'));
  END IF;
END $$;

-- ── 2. WIDEN PILLAR CHECK ───────────────────────────────────────────
-- Old: ('food_safety', 'fire_safety')
-- New: ('food_safety', 'fire_safety', 'business_records', 'vendor_business')

ALTER TABLE onboarding_pillar_requirements
  DROP CONSTRAINT IF EXISTS onboarding_pillar_requirements_pillar_check;

ALTER TABLE onboarding_pillar_requirements
  ADD CONSTRAINT onboarding_pillar_requirements_pillar_check
  CHECK (pillar IN ('food_safety', 'fire_safety', 'business_records', 'vendor_business'));

-- ── 3. UPDATE EXISTING ROWS ────────────────────────────────────────

-- 3a. haccp_plan → conditional, does not count
UPDATE onboarding_pillar_requirements
SET is_conditional      = true,
    conditional_reason  = 'Only for specialized processes (sous vide, smoking, curing, ROP packaging)',
    counts_toward_total = false
WHERE state_code       = 'CA'
  AND pillar           = 'food_safety'
  AND requirement_code = 'haccp_plan';

-- 3b. ahj_inspection → not conditional, but does not count
--     (fire marshal inspects the kitchen — not a document the operator holds)
UPDATE onboarding_pillar_requirements
SET counts_toward_total = false
WHERE state_code       = 'CA'
  AND pillar           = 'fire_safety'
  AND requirement_code = 'ahj_inspection';

-- 3c. Delete the single temperature_logs row — replaced by 5 itemized rows below
DELETE FROM onboarding_pillar_requirements
WHERE state_code       = 'CA'
  AND pillar           = 'food_safety'
  AND requirement_code = 'temperature_logs';

-- 3d. Shift pest_control sort_order: was 6, now 10 (after 5 temp rows at 5-9)
UPDATE onboarding_pillar_requirements
SET sort_order = 10
WHERE state_code       = 'CA'
  AND pillar           = 'food_safety'
  AND requirement_code = 'pest_control';

-- ── 4. SEED NEW FOOD SAFETY ROWS (CA) ──────────────────────────────
-- 5 itemized temperature rows (sort 5-9) + 6 other new rows (sort 11-16)

INSERT INTO onboarding_pillar_requirements
  (state_code, pillar, requirement_code, label, description, citation,
   action_type, typical_role, sort_order,
   is_conditional, conditional_reason, scope, counts_toward_total)
VALUES
  -- Temperature logs: 5 rows, all counting
  ('CA', 'food_safety', 'temp_receiving',
   'Receiving Logs',
   'Temperature verification at point of delivery for all TCS foods',
   'CalCode 113996', 'route_out', 'kitchen_manager', 5,
   false, NULL, 'location', true),

  ('CA', 'food_safety', 'temp_hot_holding',
   'Hot Holding',
   'Continuous or interval monitoring of hot-held TCS foods at or above 135 °F',
   'CalCode 113996', 'route_out', 'kitchen_manager', 6,
   false, NULL, 'location', true),

  ('CA', 'food_safety', 'temp_cold_holding',
   'Cold Holding',
   'Continuous or interval monitoring of cold-held TCS foods at or below 41 °F',
   'CalCode 113996', 'route_out', 'kitchen_manager', 7,
   false, NULL, 'location', true),

  ('CA', 'food_safety', 'temp_cooldown',
   'Cooldown',
   'Two-stage cooldown monitoring: 135 °F → 70 °F within 2 hrs, 70 °F → 41 °F within 4 hrs',
   'CalCode 114002', 'route_out', 'kitchen_manager', 8,
   false, NULL, 'location', true),

  ('CA', 'food_safety', 'temp_reheating',
   'Re-Heating',
   'Verification that reheated TCS foods reach 165 °F within 2 hours before hot holding',
   'CalCode 114014', 'route_out', 'kitchen_manager', 9,
   false, NULL, 'location', true),

  -- Other new food safety rows
  ('CA', 'food_safety', 'person_in_charge',
   'Person-in-Charge Documentation',
   'Records identifying the certified Person-in-Charge on site during operating hours',
   'CalCode 113945', 'confirm', 'kitchen_manager', 11,
   false, NULL, 'location', true),

  ('CA', 'food_safety', 'employee_health_policy',
   'Employee Health Policy',
   'Signed reporting agreements covering symptoms and reportable illnesses for all food employees',
   'CalCode 113949', 'upload', 'compliance_manager', 12,
   false, NULL, 'location', true),

  ('CA', 'food_safety', 'allergen_management',
   'Allergen Management',
   'Written allergen management procedures including identification, segregation, and communication protocols for major food allergens',
   'CalCode §113947, §113948', 'upload', 'kitchen_manager', 13,
   false, NULL, 'location', true),

  ('CA', 'food_safety', 'warewash_sanitizer',
   'Warewash & Sanitizer',
   'Sanitizer concentration test-strip logs and warewashing procedures verifying proper chemical sanitization of food-contact surfaces',
   'CalCode §114099, §114125', 'route_out', 'kitchen_manager', 14,
   false, NULL, 'location', true),

  ('CA', 'food_safety', 'grease_trap',
   'Grease Trap Service',
   'Service manifest with date, gallons collected, and hauler details for grease interceptor maintenance',
   'Local FOG ordinance', 'identify_vendor', 'facilities_manager', 15,
   true, 'Only if facility has a grease interceptor', 'location', false),

  ('CA', 'food_safety', 'backflow_prevention',
   'Backflow Prevention Test',
   'Annual backflow prevention assembly test by certified tester, filed with local water authority',
   'California Plumbing Code', 'identify_vendor', 'facilities_manager', 16,
   true, 'Only if facility has a backflow prevention device', 'location', false)

ON CONFLICT (state_code, pillar, requirement_code) DO NOTHING;

-- ── 5. SEED BUSINESS RECORDS ROWS (CA) — 8 rows ────────────────────

INSERT INTO onboarding_pillar_requirements
  (state_code, pillar, requirement_code, label, description, citation,
   action_type, typical_role, sort_order,
   is_conditional, conditional_reason, scope, counts_toward_total)
VALUES
  ('CA', 'business_records', 'general_liability_insurance',
   'General Liability Insurance',
   'Current commercial general liability policy covering the facility',
   'Business practice', 'upload', 'owner_operator', 1,
   false, NULL, 'location', true),

  ('CA', 'business_records', 'food_contamination_insurance',
   'Food Contamination / Spoilage Insurance',
   'Policy or endorsement covering food contamination, spoilage, or product liability loss. Exact coverage name varies by carrier (TBD).',
   'Business practice', 'upload', 'owner_operator', 2,
   false, NULL, 'location', true),

  ('CA', 'business_records', 'lease_agreement',
   'Lease Agreement',
   'Current lease or sublease agreement for the facility premises',
   'Business practice', 'upload', 'owner_operator', 3,
   true, 'Only if facility is leased (not owner-occupied)', 'location', false),

  ('CA', 'business_records', 'business_license',
   'Business License',
   'Current city or county business license for the operating entity',
   'CA Bus. & Prof. Code', 'upload', 'owner_operator', 4,
   false, NULL, 'location', true),

  ('CA', 'business_records', 'sellers_permit',
   'Seller''s Permit',
   'California seller''s permit issued by CDTFA for sales tax collection',
   'CDTFA', 'upload', 'owner_operator', 5,
   false, NULL, 'location', true),

  ('CA', 'business_records', 'operator_w9',
   'W-9',
   'Completed IRS Form W-9 for the operating entity',
   'IRS 26 USC 3406', 'upload', 'owner_operator', 6,
   false, NULL, 'location', true),

  ('CA', 'business_records', 'certificate_of_occupancy',
   'Certificate of Occupancy',
   'Certificate of occupancy issued by the local building authority for the current use',
   'CA Building Code', 'upload', 'owner_operator', 7,
   false, NULL, 'location', true),

  ('CA', 'business_records', 'liquor_license',
   'Liquor License',
   'ABC license authorizing on-premises sale or service of alcoholic beverages',
   'ABC Act', 'upload', 'owner_operator', 8,
   true, 'Only if facility serves alcohol', 'location', false)

ON CONFLICT (state_code, pillar, requirement_code) DO NOTHING;

-- ── 6. SEED VENDOR BUSINESS ROWS (CA) — 6 rows ─────────────────────

INSERT INTO onboarding_pillar_requirements
  (state_code, pillar, requirement_code, label, description, citation,
   action_type, typical_role, sort_order,
   is_conditional, conditional_reason, scope, counts_toward_total)
VALUES
  ('CA', 'vendor_business', 'vendor_gl_coi',
   'Vendor General Liability COI',
   'Certificate of insurance showing current commercial general liability coverage for on-site vendor',
   'Business practice', 'upload', 'facilities_manager', 1,
   false, NULL, 'vendor', true),

  ('CA', 'vendor_business', 'vendor_wc_coi',
   'Vendor Workers'' Comp COI',
   'Certificate of insurance showing current workers'' compensation coverage for on-site vendor',
   'CA Labor Code 3700', 'upload', 'facilities_manager', 2,
   false, NULL, 'vendor', true),

  ('CA', 'vendor_business', 'vendor_professional_license',
   'Vendor Professional License',
   'Current state-issued professional or contractor license for the vendor''s trade (e.g. C-16 Fire Protection)',
   'CA Bus. & Prof. Code', 'upload', 'facilities_manager', 3,
   false, NULL, 'vendor', true),

  ('CA', 'vendor_business', 'vendor_business_license',
   'Vendor Business License',
   'Current city or county business license for the vendor''s operating entity',
   'CA Bus. & Prof. Code', 'upload', 'facilities_manager', 4,
   false, NULL, 'vendor', true),

  ('CA', 'vendor_business', 'vendor_w9',
   'Vendor W-9',
   'Completed IRS Form W-9 on file for each paid vendor',
   'IRS 26 USC 3406', 'upload', 'facilities_manager', 5,
   false, NULL, 'vendor', true),

  ('CA', 'vendor_business', 'vendor_auto_coi',
   'Vendor Commercial Auto COI',
   'Certificate of insurance showing current commercial auto liability coverage for on-site vendor',
   'Business practice', 'upload', 'facilities_manager', 6,
   true, 'Often a line on the vendor''s GL policy rather than a separate certificate', 'vendor', false)

ON CONFLICT (state_code, pillar, requirement_code) DO NOTHING;

-- ── 7. UPDATE TABLE COMMENT ────────────────────────────────────────

COMMENT ON TABLE onboarding_pillar_requirements IS
  'Canonical requirements catalog per state and pillar. CA seeded at launch. counts_toward_total drives the "X of Y required" denominator; is_conditional flags items that only apply to some facilities. scope = vendor means one instance per active vendor per location.';
