export type ServiceCadence = {
  id: string;
  service_code: string;
  display_name: string;
  pillar: 'fire_safety' | 'food_safety';
  pillar_label: string;
  regulatory_basis: string;
  sub_detail: string;
  default_cadence_days: number;
  short_description: string;
  managed_by?: string;
};

export const COMMON_SERVICE_CADENCES: ServiceCadence[] = [
  // ── Fire Safety pillar ────────────────────────────────────
  {
    id: 'kitchen_exhaust_cleaning',
    service_code: 'kec',
    display_name: 'Kitchen Exhaust Cleaning',
    pillar: 'fire_safety',
    pillar_label: 'Fire Safety',
    regulatory_basis: 'NFPA 96',
    sub_detail: 'NFPA 96',
    default_cadence_days: 90,
    short_description: 'Professional kitchen exhaust hood, duct, and fan cleaning.',
  },
  {
    id: 'grease_filter_exchange',
    service_code: 'gfx',
    display_name: 'Grease Filter Exchange (GFX)',
    pillar: 'fire_safety',
    pillar_label: 'Fire Safety',
    regulatory_basis: 'NFPA 96 \u00b7 CWA',
    sub_detail: 'NFPA 96 \u00b7 CWA-required',
    default_cadence_days: 90,
    short_description: 'Off-site replacement of saturated baffle filters under NFPA 96.',
  },
  {
    id: 'fan_performance_management',
    service_code: 'fpm',
    display_name: 'Fan Performance Management (FPM)',
    pillar: 'fire_safety',
    pillar_label: 'Fire Safety',
    regulatory_basis: 'NFPA 96',
    sub_detail: 'NFPA 96',
    default_cadence_days: 180,
    short_description: 'Preventive maintenance for the exhaust fan \u2014 belts, bearings, motor amperage.',
  },
  {
    id: 'rooftop_grease_containment',
    service_code: 'rgc',
    display_name: 'Rooftop Grease Containment (RGC)',
    pillar: 'fire_safety',
    pillar_label: 'Fire Safety',
    regulatory_basis: 'NFPA 96',
    sub_detail: 'NFPA 96',
    default_cadence_days: 90,
    short_description: 'Captures rooftop grease before it accumulates under NFPA 96.',
  },
  {
    id: 'fire_suppression',
    service_code: 'fire_suppression',
    display_name: 'Fire Suppression',
    pillar: 'fire_safety',
    pillar_label: 'Fire Safety',
    regulatory_basis: 'NFPA 17A \u00b7 NFPA 96',
    sub_detail: 'NFPA 17A \u00b7 NFPA 96 \u00b7 PSE-required',
    default_cadence_days: 180,
    short_description: 'Inspection of the kitchen fire suppression system.',
  },
  {
    id: 'fire_alarm',
    service_code: 'fire_alarm',
    display_name: 'Automatic Fire Alarm',
    pillar: 'fire_safety',
    pillar_label: 'Fire Safety',
    regulatory_basis: 'NFPA 72',
    sub_detail: 'NFPA 72 \u00b7 PSE-required',
    default_cadence_days: 365,
    short_description: 'Inspection and testing of the automatic fire alarm system.',
  },
  {
    id: 'fire_sprinkler',
    service_code: 'fire_sprinkler',
    display_name: 'Fire Sprinkler',
    pillar: 'fire_safety',
    pillar_label: 'Fire Safety',
    regulatory_basis: 'NFPA 25',
    sub_detail: 'NFPA 25 \u00b7 PSE-required',
    default_cadence_days: 365,
    short_description: 'Inspection, testing, and maintenance of the fire sprinkler system.',
  },
  {
    id: 'fire_extinguisher',
    service_code: 'fire_extinguisher',
    display_name: 'Fire Extinguishers',
    pillar: 'fire_safety',
    pillar_label: 'Fire Safety',
    regulatory_basis: 'NFPA 10',
    sub_detail: 'NFPA 10',
    default_cadence_days: 365,
    short_description: 'Inspection and tagging of all portable fire extinguishers.',
  },
  // ── Food Safety pillar ────────────────────────────────────
  {
    id: 'pest_control',
    service_code: 'pest_control',
    display_name: 'Pest Control',
    pillar: 'food_safety',
    pillar_label: 'Food Safety',
    regulatory_basis: 'CalCode \u00a7114259.1',
    sub_detail: 'CalCode \u00a7114259.1',
    default_cadence_days: 30,
    short_description: 'Licensed pest control operator service visit.',
  },
  {
    id: 'grease_trap_service',
    service_code: 'grease_trap',
    display_name: 'Grease Trap Service',
    pillar: 'food_safety',
    pillar_label: 'Food Safety',
    regulatory_basis: 'Local FOG ordinance',
    sub_detail: 'Local FOG ordinance',
    default_cadence_days: 90,
    short_description: 'Grease trap pumping and service with manifest.',
    managed_by: 'facility_services',
  },
];

/** Map service cadence id \u2192 calendar_events.category value */
export const CADENCE_TO_EVENT_CATEGORY: Record<string, string> = {
  kitchen_exhaust_cleaning: 'Hood Cleaning Inspection',
  grease_filter_exchange: 'Grease Filter Exchange',
  fan_performance_management: 'Fan Performance Management',
  rooftop_grease_containment: 'Rooftop Grease Containment',
  fire_suppression: 'Fire Suppression Inspection',
  fire_alarm: 'Fire Alarm Inspection',
  fire_sprinkler: 'Fire Sprinkler Inspection',
  fire_extinguisher: 'Fire Extinguisher Inspection',
  pest_control: 'Pest Control Service',
  grease_trap_service: 'Grease Trap Service',
};
