/**
 * SIGNAL-RENDER-01 — Signal type rendering constants
 *
 * Five rendering categories that determine how a signal card is displayed.
 * Granular signal_type values from intelligence_signals are mapped to these
 * categories via getSignalRenderType().
 */

export const SIGNAL_TYPES = {
  INTELLIGENCE:        'intelligence',
  GAME_PLAN:           'game_plan',
  OUTBREAK:            'outbreak',
  REGULATORY_CHANGE:   'regulatory_change',
  VENDOR_INTELLIGENCE: 'vendor_intelligence',
} as const;

export type SignalType = typeof SIGNAL_TYPES[keyof typeof SIGNAL_TYPES];

export const SIGNAL_TYPE_LABELS: Record<string, string> = {
  intelligence:        'Intelligence',
  game_plan:           'Game Plan',
  outbreak:            'Outbreak Alert',
  regulatory_change:   'Regulatory Change',
  vendor_intelligence: 'Vendor Intelligence',
};

export const SIGNAL_TYPE_COLORS: Record<string, string> = {
  intelligence:        '#1E2D4D',   // Midnight Navy
  game_plan:           '#166534',   // P4 Operational green
  outbreak:            '#991B1B',   // P2 Liability red
  regulatory_change:   '#1E2D4D',   // P3 Cost blue
  vendor_intelligence: '#6B21A8',   // P5 Workforce purple
};

/**
 * Maps granular signal_type values from the DB to one of the 5 rendering categories.
 * Falls back to 'intelligence' for unknown or missing types.
 */
const RENDER_TYPE_MAP: Record<string, SignalType> = {
  // Direct matches
  intelligence:        'intelligence',
  game_plan:           'game_plan',
  outbreak:            'outbreak',
  regulatory_change:   'regulatory_change',
  vendor_intelligence: 'vendor_intelligence',

  // OUTBREAK rendering — food safety emergencies / recalls
  health_alert:        'outbreak',
  allergen_alert:      'outbreak',
  fda_recall:          'outbreak',
  recall:              'outbreak',

  // REGULATORY_CHANGE rendering — regulatory / compliance / code changes
  legislation:         'regulatory_change',
  legislative:         'regulatory_change',
  fire_code_update:    'regulatory_change',
  inspection_frequency:'regulatory_change',
  inspection_methodology: 'regulatory_change',
  nfpa_update:         'regulatory_change',
  osfm_update:         'regulatory_change',
  calfire_update:      'regulatory_change',
  fire_inspection_change: 'regulatory_change',
  permit_change:       'regulatory_change',
};

export function getSignalRenderType(signalType: string | null | undefined): SignalType {
  if (!signalType) return SIGNAL_TYPES.INTELLIGENCE;
  return RENDER_TYPE_MAP[signalType] || SIGNAL_TYPES.INTELLIGENCE;
}
