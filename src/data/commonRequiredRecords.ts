export type RequiredRecord = {
  id: string;
  tab: 'kitchen_employee' | 'vendor_service' | 'vendor_business';
  display_name: string;
  regulatory_basis: string;
  short_description: string;
};

export const COMMON_REQUIRED_RECORDS: RequiredRecord[] = [
  // ── KITCHEN & EMPLOYEE (5) ──────────────────────────────────────────
  {
    id: 'ca_health_permit',
    tab: 'kitchen_employee',
    display_name: 'Health Department Permit',
    regulatory_basis: 'Food safety · CalCode §114381',
    short_description: 'Current operating permit from your local health authority.',
  },
  {
    id: 'ca_food_handler_card',
    tab: 'kitchen_employee',
    display_name: 'California Food Handler Cards',
    regulatory_basis: 'Food safety · CalCode §113948',
    short_description: 'Required for all food employees within 30 days of hire. 3-year validity.',
  },
  {
    id: 'ca_food_protection_manager',
    tab: 'kitchen_employee',
    display_name: 'Certified Food Protection Manager',
    regulatory_basis: 'Food safety · CalCode §113947.1',
    short_description: 'At least one certified manager on duty during all hours of operation.',
  },
  {
    id: 'ca_person_in_charge',
    tab: 'kitchen_employee',
    display_name: 'Person-in-Charge Documentation',
    regulatory_basis: 'Food safety · CalCode §113945',
    short_description: 'Records identifying the certified Person-in-Charge on site during operating hours.',
  },
  {
    id: 'ca_employee_health_policy',
    tab: 'kitchen_employee',
    display_name: 'Employee Health Policy',
    regulatory_basis: 'Food safety · CalCode §113949',
    short_description: 'Signed reporting agreements covering symptoms and reportable illnesses.',
  },

  // ── VENDOR SERVICE RECORDS (5) ──────────────────────────────────────
  {
    id: 'ca_hood_cleaning',
    tab: 'vendor_service',
    display_name: 'Hood Cleaning Certificate',
    regulatory_basis: 'Fire safety · NFPA 96',
    short_description: 'Proof kitchen exhaust hoods, ducts, and fans have been professionally cleaned.',
  },
  {
    id: 'ca_fire_suppression',
    tab: 'vendor_service',
    display_name: 'Fire Suppression System Inspection',
    regulatory_basis: 'Fire safety · NFPA 96 / NFPA 17A',
    short_description: 'Semi-annual inspection of the kitchen fire suppression system.',
  },
  {
    id: 'ca_fire_extinguisher_tags',
    tab: 'vendor_service',
    display_name: 'Fire Extinguisher Inspection Tags',
    regulatory_basis: 'Fire safety · NFPA 10',
    short_description: 'Current inspection tags on all portable fire extinguishers.',
  },
  {
    id: 'ca_pest_control',
    tab: 'vendor_service',
    display_name: 'Pest Control Service Report',
    regulatory_basis: 'Food safety · CalCode §114259.1',
    short_description: 'Monthly service report from a licensed pest control operator.',
  },
  {
    id: 'ca_grease_trap',
    tab: 'vendor_service',
    display_name: 'Grease Trap Service Manifest',
    regulatory_basis: 'Facility services · Local FOG ordinance',
    short_description: 'Service manifest with date, gallons collected, and hauler details.',
  },

  // ── VENDOR BUSINESS INFORMATION (3) ─────────────────────────────────
  {
    id: 'ca_vendor_coi',
    tab: 'vendor_business',
    display_name: 'Vendor Certificate of Insurance',
    regulatory_basis: 'Business practice',
    short_description: "General liability and workers' comp coverage for each on-site vendor.",
  },
  {
    id: 'ca_vendor_business_license',
    tab: 'vendor_business',
    display_name: 'Vendor Business License',
    regulatory_basis: 'Business practice',
    short_description: 'Current business license for each vendor providing on-site services.',
  },
  {
    id: 'ca_vendor_w9',
    tab: 'vendor_business',
    display_name: 'Vendor W-9',
    regulatory_basis: 'Business practice',
    short_description: 'Completed W-9 form on file for each paid vendor.',
  },
];

/** Map from page tab ID to required records sub-tab key */
export const TAB_TO_SUBTAB: Record<string, RequiredRecord['tab']> = {
  kitchen: 'kitchen_employee',
  service: 'vendor_service',
  business: 'vendor_business',
};

/** Get required records filtered by page tab */
export function getRecordsForTab(tab: RequiredRecord['tab']): RequiredRecord[] {
  return COMMON_REQUIRED_RECORDS.filter((r) => r.tab === tab);
}
