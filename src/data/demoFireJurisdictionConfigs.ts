// ═══════════════════════════════════════════════════════════════════
// src/data/demoFireJurisdictionConfigs.ts
// Fire jurisdiction configurations for demo locations.
// Separate file — does NOT modify demoJurisdictions.ts.
// Merged at runtime in useJurisdiction hook.
// Updated FIRE-JIE-CA-01: normalized fire_ahj_type, 2025 CFC,
// NFPA 96-2024 Table 12.4 structured frequencies.
// ═══════════════════════════════════════════════════════════════════

import type { FireJurisdictionConfig } from '../types/jurisdiction';

// Shared NFPA 96-2024 Table 12.4 cleaning frequencies (same for all CA jurisdictions)
const NFPA_96_TABLE_12_4 = {
  type_i_heavy_volume: 'monthly',
  type_i_moderate_volume: 'quarterly',
  type_i_low_volume: 'semi_annual',
  type_ii: 'annual',
  solid_fuel_cooking: 'monthly',
  source: 'NFPA 96-2024 Table 12.4',
} as const;

// Shared equipment configs (same for all CA jurisdictions)
const SHARED_EQUIPMENT = {
  hood_suppression: {
    system_type: 'UL-300 wet chemical',
    inspection_interval: 'semi_annual',
    standard: 'NFPA 96 / UL-300',
  },
  ansul_system: {
    required: true,
    inspection_interval: 'semi_annual',
    standard: 'NFPA 17A',
  },
  fire_extinguisher: {
    types: ['K-class', 'ABC'],
    inspection_interval: 'annual',
    hydrostatic_test: '6-year K-class / 12-year ABC',
  },
  fire_alarm: {
    required: true,
    monitoring_type: 'central_station',
    inspection_interval: 'annual',
  },
  sprinkler_system: {
    required: true,
    inspection_interval: 'annual',
    type: 'wet',
  },
  grease_trap: {
    required: true,
    cleaning_interval: '90_days',
    interceptor_type: 'gravity',
  },
  pse_safeguards: ['hood_cleaning', 'fire_suppression_system', 'sprinklers', 'fire_alarm_monitoring'],
} as const;

// Downtown → Fresno (City of Fresno FD for city limits, Fresno County Fire for unincorporated)
const fresnoFireConfig: FireJurisdictionConfig = {
  fire_ahj_name: 'City of Fresno Fire Department',
  fire_ahj_type: 'municipal_fire',
  fire_code_edition: '2025 CFC',
  nfpa_96_edition: '2024',
  title_19_ccr: true,
  nfpa_96_table_12_4: { ...NFPA_96_TABLE_12_4 },
  ...SHARED_EQUIPMENT,
  ahj_split_notes: 'City of Fresno FD covers city limits. Fresno County Fire / CAL FIRE covers unincorporated areas. Verify address for correct AHJ.',
  federal_overlay: null,
};

// Airport → Merced (City of Merced FD for city, Merced County Fire / CAL FIRE for unincorporated)
const mercedFireConfig: FireJurisdictionConfig = {
  fire_ahj_name: 'City of Merced Fire Department',
  fire_ahj_type: 'municipal_fire',
  fire_code_edition: '2025 CFC',
  nfpa_96_edition: '2024',
  title_19_ccr: true,
  nfpa_96_table_12_4: { ...NFPA_96_TABLE_12_4 },
  ...SHARED_EQUIPMENT,
  ahj_split_notes: 'City of Merced FD covers city limits. Merced County Fire / CAL FIRE MMU covers unincorporated areas and airport vicinity.',
  federal_overlay: null,
};

// University → Stanislaus County (Modesto FD for city, Stanislaus Consolidated FPD for unincorporated)
const stanislausFireConfig: FireJurisdictionConfig = {
  fire_ahj_name: 'Modesto Fire Department, Fire Prevention Division',
  fire_ahj_type: 'municipal_fire',
  fire_code_edition: '2025 CFC',
  nfpa_96_edition: '2024',
  title_19_ccr: true,
  nfpa_96_table_12_4: { ...NFPA_96_TABLE_12_4 },
  ...SHARED_EQUIPMENT,
  ahj_split_notes: 'Modesto FD covers City of Modesto. Stanislaus Consolidated Fire Protection District covers unincorporated areas near CSU Stanislaus.',
  federal_overlay: null,
};

// Yosemite → Mariposa County (CAL FIRE MMU + NPS federal overlay)
const mariposaFireConfig: FireJurisdictionConfig = {
  fire_ahj_name: 'CAL FIRE Madera-Mariposa-Merced Unit (MMU)',
  fire_ahj_type: 'cal_fire_contract',
  fire_code_edition: '2025 CFC',
  nfpa_96_edition: '2024',
  title_19_ccr: true,
  nfpa_96_table_12_4: { ...NFPA_96_TABLE_12_4 },
  ...SHARED_EQUIPMENT,
  ahj_split_notes: 'CAL FIRE MMU covers Mariposa County (state responsibility areas). Within Yosemite National Park boundaries, NPS structural fire has concurrent jurisdiction.',
  federal_overlay: {
    agency: 'NPS',
    authority: 'NPS Director\'s Order 58 / Reference Manual 58',
    notes: 'NPS Yosemite Structural Fire has concurrent jurisdiction within park boundaries. Concession facilities must meet both CAL FIRE and NPS fire safety requirements — whichever is more stringent applies.',
  },
};

export const demoFireJurisdictionConfigs: Record<string, FireJurisdictionConfig> = {
  'demo-loc-downtown': fresnoFireConfig,
  'demo-loc-airport': mercedFireConfig,
  'demo-loc-university': stanislausFireConfig,
  'demo-loc-yosemite': mariposaFireConfig,
};
