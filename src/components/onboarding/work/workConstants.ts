/** Checkpoint 2 — mappings for Work tab execution */

/** requirement_code → service_type_definitions.code for location_service_schedules FK */
export const REQUIREMENT_TO_SERVICE_CODE: Record<string, string> = {
  hood_cleaning: 'KEC',
  fire_suppression: 'FS',
  fire_alarm: 'FA',
  sprinkler_system: 'SP',
  fire_extinguishers: 'FE',
  pest_control: 'PC',
};

/** requirement_code → vendor service_type search terms for Option B vendor lookup */
export const REQUIREMENT_TO_VENDOR_SERVICE: Record<string, string[]> = {
  hood_cleaning: ['Hood Cleaning', 'Kitchen Exhaust'],
  fire_suppression: ['Fire Suppression'],
  fire_extinguishers: ['Fire Extinguisher'],
  fire_alarm: ['Alarm System', 'Fire Alarm'],
  sprinkler_system: ['Sprinkler', 'Fire Sprinkler'],
  pest_control: ['Pest Control'],
};

/** requirement_code → compliance_documents.category for uploads */
export const REQUIREMENT_TO_DOC_CATEGORY: Record<string, string> = {
  health_permit: 'kitchen',
  food_manager_cert: 'kitchen',
  food_handler_cards: 'employee',
  haccp_plan: 'kitchen',
  pest_control: 'service',
  hood_cleaning: 'service',
  fire_suppression: 'service',
  fire_extinguishers: 'service',
  fire_alarm: 'service',
  sprinkler_system: 'service',
  ahj_inspection: 'kitchen',
  temperature_logs: 'kitchen',
};

/** Action verb labels per action_type */
export const ACTION_LABELS: Record<string, string> = {
  upload: 'Upload',
  identify_vendor: 'Identify vendor',
  route_out: 'Go to',
  confirm: 'Confirm',
};

/** Frequency options for vendor service schedules */
export const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-annual' },
  { value: 'annual', label: 'Annual' },
] as const;

/** Role display labels */
export const ROLE_LABELS: Record<string, string> = {
  compliance_manager: 'Compliance Officer',
  facilities_manager: 'Facilities Manager',
  kitchen_manager: 'Kitchen Manager',
  chef: 'Chef',
  executive: 'Executive',
  owner_operator: 'Owner/Operator',
  kitchen_staff: 'Kitchen Staff',
};
