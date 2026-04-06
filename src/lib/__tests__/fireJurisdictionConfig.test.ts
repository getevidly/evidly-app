// FIRE-JIE-CA-01, FIRE-JIE-NV-01 — Tests for fire jurisdiction config JSONB structure
import { describe, it, expect } from 'vitest';
import { demoFireJurisdictionConfigs } from '../../data/demoFireJurisdictionConfigs';
import type { FireAhjType } from '../../types/jurisdiction';

const VALID_AHJ_TYPES: FireAhjType[] = [
  'municipal_fire', 'county_fire', 'fire_district', 'cal_fire_contract', 'state_fire_marshal', 'mixed',
];

describe('Fire Jurisdiction Config', () => {
  describe('FireAhjType normalization', () => {
    it('defines exactly 6 normalized AHJ types', () => {
      expect(VALID_AHJ_TYPES).toHaveLength(6);
    });

    it('does not include old un-normalized types', () => {
      const oldTypes = [
        'city_fire', 'city_fd', 'city', 'county_fd', 'county_fire_authority',
        'county_multi', 'cal_fire', 'cal_fire_primary', 'mixed_cal_fire_city',
        'mixed_county_city', 'mixed_county_cal_fire', 'county_cal_fire',
        'mixed_cal_fire_city_district', 'city_fire_and_cal_fire', 'state_fire',
      ];
      for (const old of oldTypes) {
        expect(VALID_AHJ_TYPES).not.toContain(old);
      }
    });
  });

  describe('NFPA 96-2024 Table 12.4 structure', () => {
    it('has correct cleaning frequency keys', () => {
      const config = demoFireJurisdictionConfigs['demo-loc-downtown'];
      const table = config.nfpa_96_table_12_4;
      expect(table.type_i_heavy_volume).toBe('monthly');
      expect(table.type_i_moderate_volume).toBe('quarterly');
      expect(table.type_i_low_volume).toBe('semi_annual');
      expect(table.type_ii).toBe('annual');
      expect(table.solid_fuel_cooking).toBe('monthly');
      expect(table.source).toBe('NFPA 96-2024 Table 12.4');
    });

    it('frequencies are consistent across all demo configs', () => {
      const configs = Object.values(demoFireJurisdictionConfigs);
      for (const config of configs) {
        expect(config.nfpa_96_table_12_4.type_i_heavy_volume).toBe('monthly');
        expect(config.nfpa_96_table_12_4.type_i_moderate_volume).toBe('quarterly');
        expect(config.nfpa_96_table_12_4.type_ii).toBe('annual');
      }
    });
  });

  describe('demo fire configs', () => {
    it('has 4 demo location configs', () => {
      expect(Object.keys(demoFireJurisdictionConfigs)).toHaveLength(4);
    });

    it.each(Object.entries(demoFireJurisdictionConfigs))(
      '%s has all required fields',
      (_key, config) => {
        expect(config.fire_ahj_name).toBeTruthy();
        expect(VALID_AHJ_TYPES).toContain(config.fire_ahj_type);
        expect(config.fire_code_edition).toBe('2025 CFC');
        expect(config.nfpa_96_edition).toBe('2024');
        expect(config.title_19_ccr).toBe(true);
        expect(config.nfpa_96_table_12_4).toBeDefined();
        expect(config.hood_suppression).toBeDefined();
        expect(config.ansul_system).toBeDefined();
        expect(config.fire_extinguisher).toBeDefined();
        expect(config.fire_alarm).toBeDefined();
        expect(config.sprinkler_system).toBeDefined();
        expect(config.grease_trap).toBeDefined();
        expect(config.pse_safeguards).toBeDefined();
      },
    );

    it('fresno uses municipal_fire type', () => {
      expect(demoFireJurisdictionConfigs['demo-loc-downtown'].fire_ahj_type).toBe('municipal_fire');
    });

    it('mariposa uses cal_fire_contract type', () => {
      expect(demoFireJurisdictionConfigs['demo-loc-yosemite'].fire_ahj_type).toBe('cal_fire_contract');
    });

    it('mariposa has NPS federal overlay', () => {
      const config = demoFireJurisdictionConfigs['demo-loc-yosemite'];
      expect(config.federal_overlay).not.toBeNull();
      expect(config.federal_overlay?.agency).toBe('NPS');
    });

    it('non-yosemite locations have null federal_overlay', () => {
      expect(demoFireJurisdictionConfigs['demo-loc-downtown'].federal_overlay).toBeNull();
      expect(demoFireJurisdictionConfigs['demo-loc-airport'].federal_overlay).toBeNull();
      expect(demoFireJurisdictionConfigs['demo-loc-university'].federal_overlay).toBeNull();
    });
  });

  describe('PSE safeguards', () => {
    it('includes 4 safeguard categories', () => {
      const config = demoFireJurisdictionConfigs['demo-loc-downtown'];
      expect(config.pse_safeguards).toHaveLength(4);
      expect(config.pse_safeguards).toContain('hood_cleaning');
      expect(config.pse_safeguards).toContain('fire_suppression_system');
      expect(config.pse_safeguards).toContain('fire_extinguisher');
      expect(config.pse_safeguards).toContain('fire_alarm_monitoring');
    });
  });

  describe('equipment standards', () => {
    it('hood suppression uses UL-300 wet chemical', () => {
      const config = demoFireJurisdictionConfigs['demo-loc-downtown'];
      expect(config.hood_suppression.system_type).toBe('UL-300 wet chemical');
      expect(config.hood_suppression.standard).toBe('NFPA 96 / UL-300');
    });

    it('ansul system references NFPA 17A', () => {
      const config = demoFireJurisdictionConfigs['demo-loc-downtown'];
      expect(config.ansul_system.standard).toBe('NFPA 17A');
    });

    it('fire extinguisher types include K-class and ABC', () => {
      const config = demoFireJurisdictionConfigs['demo-loc-downtown'];
      expect(config.fire_extinguisher.types).toContain('K-class');
      expect(config.fire_extinguisher.types).toContain('ABC');
    });
  });

  describe('2025 CFC edition', () => {
    it('all configs use 2025 CFC (not 2022)', () => {
      for (const config of Object.values(demoFireJurisdictionConfigs)) {
        expect(config.fire_code_edition).toBe('2025 CFC');
        expect(config.fire_code_edition).not.toBe('2022 CFC');
      }
    });
  });
});
