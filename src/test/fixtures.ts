export const TEST_USER = {
  id: 'test-user-uuid-0001',
  email: 'test@evidly-test.com',
  role: 'owner_operator' as const,
};

export const TEST_ORG = {
  id: 'test-org-uuid-0001',
  name: 'Test Kitchen Co',
  is_demo: false,
  is_active: true,
};

export const TEST_LOCATION = {
  id: 'test-loc-uuid-0001',
  organization_id: 'test-org-uuid-0001',
  name: 'Main Kitchen',
  county: 'Fresno',
  state: 'CA',
};

export const TEST_IRR_SUBMISSION = {
  id: 'test-irr-uuid-0001',
  business_name: 'Test Kitchen Co',
  email: 'test@evidly-test.com',
  posture: 'moderate' as const,
  food_safety_score: 4,
  facility_safety_score: 3,
  q1_receiving_temps: 1,
  q2_cold_hot_holding: 2,
  q3_cooldown_logs: 3,
  q4_checklists_haccp: 1,
  q5_food_handler_cards: 2,
  q6_staff_cert_tracking: 3,
  q7_hood_cleaning: 1,
  q8_fire_suppression: 2,
  q9_vendor_performance: 1,
  q10_vendor_records: 3,
  q11_vendor_coi: 2,
  created_at: new Date().toISOString(),
};
