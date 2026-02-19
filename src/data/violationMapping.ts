// ============================================================
// Violation Mapping Engine
// Maps EvidLY checklist/log items → CalCode sections + severity
// ============================================================

export type ViolationSeverity = 'critical' | 'major' | 'minor' | 'good_practice';

export interface ViolationMapping {
  /** Internal key matching scoreImpactData label patterns */
  evidlyItem: string;
  /** CalCode or CFC section reference */
  calCodeSection: string;
  /** Human-readable description */
  description: string;
  /** Default severity for Generic CalCode jurisdictions */
  defaultSeverity: ViolationSeverity;
  /** County-specific severity overrides (county slug → severity) */
  countyOverrides?: Partial<Record<string, ViolationSeverity>>;
  /** Which pillar this maps to */
  pillar: 'Food Safety' | 'Fire Safety';
}

/**
 * Master violation mapping table.
 * Each entry maps an EvidLY scoreImpactData label pattern to a CalCode violation.
 * The `evidlyItem` is matched via case-insensitive substring against scoreImpactData labels.
 */
export const VIOLATION_MAPPINGS: ViolationMapping[] = [
  {
    evidlyItem: 'cold_holding',
    calCodeSection: '§113996',
    description: 'Cold holding temperature violation (below 41°F required)',
    defaultSeverity: 'critical',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'hot_holding',
    calCodeSection: '§113996',
    description: 'Hot holding temperature violation (above 135°F required)',
    defaultSeverity: 'critical',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'temperature',
    calCodeSection: '§113996',
    description: 'Temperature monitoring violation',
    defaultSeverity: 'major',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'food_manager',
    calCodeSection: '§113947.1',
    description: 'No certified food protection manager on duty',
    defaultSeverity: 'major',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'food_handler',
    calCodeSection: '§113948',
    description: 'Expired or missing food handler card',
    defaultSeverity: 'minor',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'handwash',
    calCodeSection: '§113953',
    description: 'Handwash sink blocked, inaccessible, or not supplied',
    defaultSeverity: 'critical',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'thermometer',
    calCodeSection: '§114157',
    description: 'Missing or non-functional probe thermometer',
    defaultSeverity: 'minor',
    pillar: 'Fire Safety',
  },
  {
    evidlyItem: 'hood_cleaning',
    calCodeSection: '§114149',
    description: 'Hood and exhaust system cleaning overdue',
    defaultSeverity: 'minor',
    countyOverrides: {
      kern: 'major',
    },
    pillar: 'Fire Safety',
  },
  {
    evidlyItem: 'fire_suppression',
    calCodeSection: 'NFPA 96 §904',
    description: 'Fire suppression system inspection expired',
    defaultSeverity: 'critical',
    pillar: 'Fire Safety',
  },
  {
    evidlyItem: 'pest_control',
    calCodeSection: '§114259',
    description: 'Pest control records missing or service overdue',
    defaultSeverity: 'major',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'cooling',
    calCodeSection: '§114002(a)',
    description: 'Cooling time/temperature violation',
    defaultSeverity: 'critical',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'employee_health',
    calCodeSection: '§113949.5',
    description: 'Employee health certification gap',
    defaultSeverity: 'minor',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'health_permit',
    calCodeSection: '§114381',
    description: 'Health permit expired or not displayed',
    defaultSeverity: 'critical',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'haccp',
    calCodeSection: '§114419',
    description: 'HACCP plan monitoring not performed',
    defaultSeverity: 'major',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'checklist',
    calCodeSection: '§114419',
    description: 'Required operational checklist not completed',
    defaultSeverity: 'minor',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'vendor_cert',
    calCodeSection: '§114065',
    description: 'Vendor certificate of insurance expired',
    defaultSeverity: 'minor',
    pillar: 'Food Safety',
  },
  {
    evidlyItem: 'grease_trap',
    calCodeSection: '§114149',
    description: 'Grease trap/interceptor service overdue',
    defaultSeverity: 'minor',
    countyOverrides: {
      kern: 'major',
    },
    pillar: 'Fire Safety',
  },
  {
    evidlyItem: 'equipment_maintenance',
    calCodeSection: '§114130',
    description: 'Equipment maintenance overdue',
    defaultSeverity: 'minor',
    pillar: 'Fire Safety',
  },
];

/**
 * Label-to-violation matching patterns.
 * Maps scoreImpactData label substrings to violationMapping evidlyItem keys.
 */
const LABEL_PATTERNS: [string, string][] = [
  ['temperature', 'temperature'],
  ['cold holding', 'cold_holding'],
  ['hot holding', 'hot_holding'],
  ['food manager', 'food_manager'],
  ['food handler', 'food_handler'],
  ['handwash', 'handwash'],
  ['thermometer', 'thermometer'],
  ['hood cleaning', 'hood_cleaning'],
  ['fire suppression', 'fire_suppression'],
  ['pest control', 'pest_control'],
  ['cooling', 'cooling'],
  ['employee health', 'employee_health'],
  ['health permit', 'health_permit'],
  ['haccp', 'haccp'],
  ['checklist', 'checklist'],
  ['vendor c', 'vendor_cert'],   // matches "Vendor Cert", "Vendor COI", "Vendor Certificate"
  ['grease trap', 'grease_trap'],
  ['equipment maintenance', 'equipment_maintenance'],
  ['equipment condition', 'equipment_maintenance'],
];

/**
 * Given a scoreImpactData label, find the matching ViolationMapping.
 * Returns null if no match found.
 */
export function findViolationMapping(label: string): ViolationMapping | null {
  const lowerLabel = label.toLowerCase();
  for (const [pattern, itemKey] of LABEL_PATTERNS) {
    if (lowerLabel.includes(pattern)) {
      return VIOLATION_MAPPINGS.find(m => m.evidlyItem === itemKey) || null;
    }
  }
  return null;
}

/**
 * Get the effective severity for a violation in a specific county.
 * Falls back to defaultSeverity if no county override exists.
 */
export function getEffectiveSeverity(
  mapping: ViolationMapping,
  countySlug: string,
): ViolationSeverity {
  return mapping.countyOverrides?.[countySlug] ?? mapping.defaultSeverity;
}
