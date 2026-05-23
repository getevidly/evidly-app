export type ServiceCadence = {
  id: string;
  display_name: string;
  category: 'fire_safety' | 'food_safety' | 'facility_services';
  regulatory_basis: string;
  default_cadence_days: number;
  cadence_label: string;
  short_description: string;
};

export const COMMON_SERVICE_CADENCES: ServiceCadence[] = [
  {
    id: 'hood_cleaning',
    display_name: 'Hood Cleaning',
    category: 'fire_safety',
    regulatory_basis: 'Fire safety · NFPA 96',
    default_cadence_days: 90,
    cadence_label: 'Typically quarterly. Frequency varies by cooking volume.',
    short_description: 'Professional kitchen exhaust hood, duct, and fan cleaning.',
  },
  {
    id: 'fire_suppression_inspection',
    display_name: 'Fire Suppression Inspection',
    category: 'fire_safety',
    regulatory_basis: 'Fire safety · NFPA 96 / NFPA 17A',
    default_cadence_days: 180,
    cadence_label: 'Semi-annual.',
    short_description: 'Inspection of the kitchen fire suppression system.',
  },
  {
    id: 'fire_extinguisher_inspection',
    display_name: 'Fire Extinguisher Inspection',
    category: 'fire_safety',
    regulatory_basis: 'Fire safety · NFPA 10',
    default_cadence_days: 365,
    cadence_label: 'Annual inspection. Monthly visual check by staff.',
    short_description: 'Inspection and tagging of all portable fire extinguishers.',
  },
  {
    id: 'pest_control',
    display_name: 'Pest Control',
    category: 'food_safety',
    regulatory_basis: 'Food safety · CalCode §114259.1',
    default_cadence_days: 30,
    cadence_label: 'Typically monthly.',
    short_description: 'Licensed pest control operator service visit.',
  },
  {
    id: 'grease_trap_service',
    display_name: 'Grease Trap Service',
    category: 'facility_services',
    regulatory_basis: 'Facility services · Local FOG ordinance',
    default_cadence_days: 90,
    cadence_label: 'Cadence varies by jurisdiction and trap size.',
    short_description: 'Grease trap pumping and service with manifest.',
  },
];

/** Map service cadence id → calendar_events.category value */
export const CADENCE_TO_EVENT_CATEGORY: Record<string, string> = {
  hood_cleaning: 'Hood Cleaning Inspection',
  fire_suppression_inspection: 'Fire Suppression Inspection',
  fire_extinguisher_inspection: 'Fire Extinguisher Inspection',
  pest_control: 'Pest Control Service',
  grease_trap_service: 'Grease Trap Service',
};
