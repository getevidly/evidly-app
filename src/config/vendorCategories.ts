// ── Vendor Categories — Single Source of Truth ─────────────────────
// LOCKED: Do not add/remove categories without explicit approval.

export interface ServiceDefinition {
  id: string;
  name: string;
  required: boolean;
}

export interface VendorCategory {
  id: string;
  name: string;
  services: ServiceDefinition[];
}

export const VENDOR_CATEGORIES: VendorCategory[] = [
  {
    id: 'kitchen_exhaust',
    name: 'Kitchen Exhaust Cleaning',
    services: [
      { id: 'hood_cleaning', name: 'Hood Cleaning', required: true },
      { id: 'fan_performance', name: 'Fan Performance Management', required: false },
      { id: 'grease_filter', name: 'Grease Filter Management', required: false },
      { id: 'rooftop_grease', name: 'Rooftop Grease Containment', required: false },
    ],
  },
  {
    id: 'fire_suppression',
    name: 'Fire Suppression',
    services: [
      { id: 'fire_suppression_svc', name: 'Fire Suppression Inspection & Service', required: true },
    ],
  },
  {
    id: 'fire_extinguisher',
    name: 'Fire Extinguisher Service',
    services: [
      { id: 'fire_extinguisher_svc', name: 'Fire Extinguisher Inspection & Service', required: true },
    ],
  },
  {
    id: 'pest_control',
    name: 'Pest Control',
    services: [
      { id: 'pest_control_svc', name: 'Pest Control Service', required: true },
    ],
  },
  {
    id: 'grease_trap',
    name: 'Grease Trap / Interceptor',
    services: [
      { id: 'grease_trap_svc', name: 'Grease Trap / Interceptor Pumping', required: true },
    ],
  },
  {
    id: 'backflow',
    name: 'Backflow Prevention',
    services: [
      { id: 'backflow_svc', name: 'Backflow Prevention Testing', required: false },
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC',
    services: [
      { id: 'hvac_svc', name: 'HVAC Service & Maintenance', required: false },
    ],
  },
  {
    id: 'alarm_system',
    name: 'Alarm System',
    services: [
      { id: 'alarm_svc', name: 'Alarm System Inspection & Service', required: false },
    ],
  },
  {
    id: 'equipment_repair',
    name: 'Cooking Equipment Repair',
    services: [
      { id: 'equipment_repair_svc', name: 'Cooking Equipment Repair', required: false },
    ],
  },
  {
    id: 'oil_removal',
    name: 'Used Cooking Oil Removal',
    services: [
      { id: 'oil_removal_svc', name: 'Used Cooking Oil Removal', required: false },
    ],
  },
  {
    id: 'elevator_inspection',
    name: 'Elevator Inspection',
    services: [
      { id: 'elevator_inspection_svc', name: 'Elevator Inspection & Certification', required: false },
      { id: 'elevator_maintenance_svc', name: 'Elevator Maintenance', required: false },
    ],
  },
];

// ── Mapping: existing demo vendor serviceType → category ID ────────
export const SERVICE_TYPE_TO_CATEGORY: Record<string, string> = {
  // Demo vendor serviceType strings
  'Hood Cleaning': 'kitchen_exhaust',
  'Fire Suppression': 'fire_suppression',
  'Pest Control': 'pest_control',
  'HVAC Service': 'hvac',
  'Grease Trap': 'grease_trap',
  'Grease Trap Service': 'grease_trap',
  // Category names (used by manually-added vendors)
  'Kitchen Exhaust Cleaning': 'kitchen_exhaust',
  'Fire Extinguisher Service': 'fire_extinguisher',
  'Grease Trap / Interceptor': 'grease_trap',
  'Backflow Prevention': 'backflow',
  'HVAC': 'hvac',
  'Alarm System': 'alarm_system',
  'Cooking Equipment Repair': 'equipment_repair',
  'Used Cooking Oil Removal': 'oil_removal',
  'Elevator Inspection': 'elevator_inspection',
};

// ── Helpers ────────────────────────────────────────────────────────

export function getCategoryById(id: string): VendorCategory | undefined {
  return VENDOR_CATEGORIES.find((c) => c.id === id);
}

export function getRequiredCategories(): VendorCategory[] {
  return VENDOR_CATEGORIES.filter((c) => c.services.some((s) => s.required));
}

export function getRequiredServices(): ServiceDefinition[] {
  return VENDOR_CATEGORIES.flatMap((c) => c.services.filter((s) => s.required));
}

export function getCategoryForServiceType(serviceType: string): VendorCategory | undefined {
  const catId = SERVICE_TYPE_TO_CATEGORY[serviceType];
  return catId ? getCategoryById(catId) : undefined;
}
