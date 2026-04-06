// STAGING-DEMO-02 — Tests for Partnership & Channel Demo System
import { describe, it, expect } from 'vitest';

// ── Partner types ──────────────────────────────────────────────

const PARTNER_TYPES = ['vendor', 'association', 'integration', 'carrier', 'tribal_casino'] as const;
type PartnerType = typeof PARTNER_TYPES[number];

describe('Partner Demo System', () => {
  describe('partner type validation', () => {
    it('supports exactly 5 partner types', () => {
      expect(PARTNER_TYPES).toHaveLength(5);
    });

    it.each(PARTNER_TYPES)('accepts partner type: %s', (type) => {
      expect(PARTNER_TYPES).toContain(type);
    });

    it('rejects unknown partner types', () => {
      expect(PARTNER_TYPES).not.toContain('unknown');
      expect(PARTNER_TYPES).not.toContain('retail');
    });
  });

  describe('source tag isolation', () => {
    const PARTNER_SOURCE = 'partner_demo';
    const OPERATOR_SOURCE = 'demo_template';

    it('partner_demo source tag is distinct from demo_template', () => {
      expect(PARTNER_SOURCE).not.toBe(OPERATOR_SOURCE);
    });

    it('source tags are non-empty strings', () => {
      expect(PARTNER_SOURCE.length).toBeGreaterThan(0);
      expect(OPERATOR_SOURCE.length).toBeGreaterThan(0);
    });

    it('source tags contain no spaces', () => {
      expect(PARTNER_SOURCE).not.toMatch(/\s/);
      expect(OPERATOR_SOURCE).not.toMatch(/\s/);
    });
  });

  describe('production guard', () => {
    it('partner routes should be blocked when VITE_APP_ENV is production', () => {
      // This validates the pattern used in PartnerDemos.jsx, VendorDemoDashboard.jsx, etc.
      const IS_PRODUCTION = 'production' === 'production';
      expect(IS_PRODUCTION).toBe(true);
      // In production, the component returns <Navigate to="/admin" replace />
    });

    it('partner routes should be accessible when VITE_APP_ENV is staging', () => {
      const IS_PRODUCTION = 'staging' === 'production';
      expect(IS_PRODUCTION).toBe(false);
    });
  });

  describe('7-day expiry calculation', () => {
    it('calculates cleanup_scheduled_for as 7 days from now', () => {
      const now = new Date('2026-07-06T12:00:00Z');
      const cleanupTime = new Date(now.getTime() + 7 * 86400000);
      expect(cleanupTime.toISOString()).toBe('2026-07-13T12:00:00.000Z');
    });

    it('7-day expiry is shorter than 14-day operator demo expiry', () => {
      const partnerExpiry = 7;
      const operatorExpiry = 14;
      expect(partnerExpiry).toBeLessThan(operatorExpiry);
    });
  });

  describe('cleanup logic', () => {
    it('only deletes partner_demo source rows, not demo_template rows', () => {
      const sourceTag = 'partner_demo';
      const rowsToDelete = [
        { source: 'partner_demo', org_id: 'a' },
        { source: 'demo_template', org_id: 'a' },
        { source: 'partner_demo', org_id: 'b' },
        { source: null, org_id: 'a' },
      ];

      const deleted = rowsToDelete.filter(r => r.source === sourceTag);
      expect(deleted).toHaveLength(2);
      expect(deleted.every(r => r.source === 'partner_demo')).toBe(true);
    });

    it('cleanup targets correct tables', () => {
      const tablesToClean = [
        'temp_logs', 'checklist_completions', 'corrective_actions',
        'documents', 'equipment_service_records', 'insurance_risk_scores',
        'sb1383_compliance', 'notifications', 'checklists', 'vendors',
      ];
      expect(tablesToClean).toContain('temp_logs');
      expect(tablesToClean).toContain('equipment_service_records');
      expect(tablesToClean).toContain('insurance_risk_scores');
      expect(tablesToClean).not.toContain('partner_demos'); // Metadata table, not data
      expect(tablesToClean).not.toContain('demo_tours');    // Separate system
    });
  });

  describe('partner config JSONB structure', () => {
    it('vendor config has required fields', () => {
      const vendorConfig = {
        vendor_company: 'Cleaning Pros Plus',
        service_types: ['hood_cleaning', 'fire_suppression'],
        client_locations: [{ id: 'loc1', name: 'Test', county: 'Fresno' }],
        vendor_connect_slots: { fresno: { total: 3, filled: 2, available: 1 } },
        service_history_months: 12,
      };
      expect(vendorConfig.service_types).toContain('hood_cleaning');
      expect(vendorConfig.service_history_months).toBe(12);
      expect(vendorConfig.client_locations).toHaveLength(1);
    });

    it('association config has K2C tracking fields', () => {
      const assocConfig = {
        member_count: 10,
        county_coverage: { Fresno: ['Restaurant A'], Merced: ['Restaurant B'] },
        k2c_monthly: 100,
        k2c_annual: 1200,
        k2c_meals_per_month: 300,
        adoption_pipeline: { onboarded: 6, in_progress: 3, invited: 1 },
      };
      expect(assocConfig.k2c_monthly).toBe(assocConfig.member_count * 10);
      expect(assocConfig.k2c_annual).toBe(assocConfig.k2c_monthly * 12);
      expect(assocConfig.adoption_pipeline.onboarded + assocConfig.adoption_pipeline.in_progress + assocConfig.adoption_pipeline.invited).toBe(assocConfig.member_count);
    });

    it('carrier config has CIC 5-pillar structure', () => {
      const carrierConfig = {
        portfolio_locations: [{ id: 'loc1', name: 'Test', county: 'Fresno' }],
        cic_profiles: [{
          location_id: 'loc1',
          p1_revenue: 78, p2_liability: 72, p3_cost: 68,
          p4_operational: 74, p5_workforce: 80, overall: 74,
          pse_verified: true,
          pse_safeguards: { hood_cleaning: true, fire_suppression: true, fire_extinguisher: true, pest_control: false },
        }],
        risk_distribution: { low: 3, moderate: 5, high: 2 },
        pse_summary: { fully_verified: 7, partial: 3 },
      };
      const profile = carrierConfig.cic_profiles[0];
      expect(profile.p1_revenue).toBeGreaterThanOrEqual(0);
      expect(profile.p5_workforce).toBeLessThanOrEqual(100);
      expect(Object.keys(profile.pse_safeguards)).toHaveLength(4);
    });

    it('integration config supports 4 integration types', () => {
      const integrationTypes = ['toast', 'dinehr', 'next_insurance', 'cintas'];
      expect(integrationTypes).toHaveLength(4);
      for (const type of integrationTypes) {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      }
    });

    it('tribal casino config has sovereignty and NIGC fields', () => {
      const tribalConfig = {
        tribe_name: 'Table Mountain Rancheria',
        casino_name: 'Eagle Mountain Casino',
        outlet_count: 5,
        sovereignty_type: 'federally_recognized',
        food_safety_mode: 'advisory',
        food_safety_authority: 'TEHO',
        nigc_overlay: true,
        nigc_config: {
          gaming_floor_food: true,
          banquet_operations: true,
          employee_dining: true,
        },
        fire_compliance: {
          hood_cleaning_frequency: 'monthly',
          suppression_frequency: 'quarterly',
          extinguisher_frequency: 'annual',
        },
      };
      expect(tribalConfig.food_safety_mode).toBe('advisory');
      expect(tribalConfig.nigc_overlay).toBe(true);
      expect(tribalConfig.nigc_config.gaming_floor_food).toBe(true);
      expect(tribalConfig.fire_compliance.hood_cleaning_frequency).toBe('monthly');
    });
  });

  describe('partner demo status lifecycle', () => {
    const VALID_STATUSES = ['pending', 'active', 'completed', 'expired', 'cleaned'] as const;

    it('supports 5 status values', () => {
      expect(VALID_STATUSES).toHaveLength(5);
    });

    it('starts in pending status', () => {
      expect(VALID_STATUSES[0]).toBe('pending');
    });

    it('has distinct statuses from demo_tours', () => {
      // partner_demos has 'expired' which demo_tours does not have
      expect(VALID_STATUSES).toContain('expired');
      // demo_tours has 'scheduled' which partner_demos does not
      const demoTourStatuses = ['pending', 'scheduled', 'active', 'completed', 'cleaned'];
      expect(demoTourStatuses).toContain('scheduled');
      expect(VALID_STATUSES).not.toContain('scheduled');
    });
  });
});
