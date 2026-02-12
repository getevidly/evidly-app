import { describe, it, expect } from 'vitest';
import {
  computeComplianceScore,
  computeWeightedOverall,
  calculateFoodSafetyScore,
  calculateFireSafetyScore,
  calculateVendorComplianceScore,
  PILLAR_WEIGHTS,
  DEFAULT_WEIGHTS,
  type ScoringItem,
  type PillarName,
} from '../complianceScoring';

describe('complianceScoring', () => {
  // ─── PILLAR_WEIGHTS ───────────────────────────────────
  describe('PILLAR_WEIGHTS', () => {
    it('Food Safety = 45%, Fire Safety = 35%, Vendor Compliance = 20%', () => {
      expect(PILLAR_WEIGHTS.foodSafety).toBe(0.45);
      expect(PILLAR_WEIGHTS.fireSafety).toBe(0.35);
      expect(PILLAR_WEIGHTS.vendorCompliance).toBe(0.20);
    });

    it('weights sum to 1.0', () => {
      const sum = PILLAR_WEIGHTS.foodSafety + PILLAR_WEIGHTS.fireSafety + PILLAR_WEIGHTS.vendorCompliance;
      expect(sum).toBeCloseTo(1.0);
    });
  });

  // ─── computeComplianceScore ───────────────────────────
  describe('computeComplianceScore', () => {
    it('all items compliant → 100% overall', () => {
      const items: ScoringItem[] = [
        { id: '1', name: 'Temp logs', pillar: 'foodSafety', status: 'compliant' },
        { id: '2', name: 'Checklists', pillar: 'foodSafety', status: 'compliant' },
        { id: '3', name: 'Hood cleaning', pillar: 'fireSafety', status: 'compliant' },
        { id: '4', name: 'Fire extinguisher', pillar: 'fireSafety', status: 'compliant' },
        { id: '5', name: 'Vendor certs', pillar: 'vendorCompliance', status: 'compliant' },
        { id: '6', name: 'Insurance', pillar: 'vendorCompliance', status: 'compliant' },
      ];
      const result = computeComplianceScore(items, 'loc1');
      expect(result.overall).toBe(100);
      expect(result.foodSafety).toBe(100);
      expect(result.fireSafety).toBe(100);
      expect(result.vendorCompliance).toBe(100);
    });

    it('all items non_compliant → 0% overall', () => {
      const items: ScoringItem[] = [
        { id: '1', name: 'Temp logs', pillar: 'foodSafety', status: 'non_compliant' },
        { id: '2', name: 'Checklists', pillar: 'foodSafety', status: 'non_compliant' },
        { id: '3', name: 'Hood cleaning', pillar: 'fireSafety', status: 'non_compliant' },
        { id: '4', name: 'Fire extinguisher', pillar: 'fireSafety', status: 'non_compliant' },
        { id: '5', name: 'Vendor certs', pillar: 'vendorCompliance', status: 'non_compliant' },
        { id: '6', name: 'Insurance', pillar: 'vendorCompliance', status: 'non_compliant' },
      ];
      const result = computeComplianceScore(items, 'loc1');
      expect(result.overall).toBe(0);
      expect(result.foodSafety).toBe(0);
      expect(result.fireSafety).toBe(0);
      expect(result.vendorCompliance).toBe(0);
    });

    it('mixed items → correct weighted calculation', () => {
      const items: ScoringItem[] = [
        // Food Safety: 1/2 = 50%
        { id: '1', name: 'Temp logs', pillar: 'foodSafety', status: 'compliant' },
        { id: '2', name: 'Checklists', pillar: 'foodSafety', status: 'non_compliant' },
        // Fire Safety: 2/2 = 100%
        { id: '3', name: 'Hood cleaning', pillar: 'fireSafety', status: 'compliant' },
        { id: '4', name: 'Fire extinguisher', pillar: 'fireSafety', status: 'compliant' },
        // Vendor Compliance: 0/2 = 0%
        { id: '5', name: 'Vendor certs', pillar: 'vendorCompliance', status: 'non_compliant' },
        { id: '6', name: 'Insurance', pillar: 'vendorCompliance', status: 'non_compliant' },
      ];
      const result = computeComplianceScore(items, 'loc1');
      expect(result.foodSafety).toBe(50);
      expect(result.fireSafety).toBe(100);
      expect(result.vendorCompliance).toBe(0);
      // overall = 50*0.45 + 100*0.35 + 0*0.20 = 22.5 + 35 + 0 = 57.5 → 58
      expect(result.overall).toBe(58);
    });

    it('items with not_applicable → excluded from calculation', () => {
      const items: ScoringItem[] = [
        { id: '1', name: 'Temp logs', pillar: 'foodSafety', status: 'compliant' },
        { id: '2', name: 'HACCP N/A', pillar: 'foodSafety', status: 'not_applicable' },
        { id: '3', name: 'Hood cleaning', pillar: 'fireSafety', status: 'compliant' },
        { id: '4', name: 'Exhaust N/A', pillar: 'fireSafety', status: 'not_applicable' },
        { id: '5', name: 'Vendor certs', pillar: 'vendorCompliance', status: 'compliant' },
      ];
      const result = computeComplianceScore(items, 'loc1');
      // Food Safety: 1 compliant / 1 applicable = 100%
      expect(result.foodSafety).toBe(100);
      // Fire Safety: 1 compliant / 1 applicable = 100%
      expect(result.fireSafety).toBe(100);
      // Vendor Compliance: 1 compliant / 1 applicable = 100%
      expect(result.vendorCompliance).toBe(100);
      expect(result.overall).toBe(100);
    });

    it('empty items → 0% overall', () => {
      const result = computeComplianceScore([], 'loc1');
      expect(result.overall).toBe(0);
      expect(result.foodSafety).toBe(0);
      expect(result.fireSafety).toBe(0);
      expect(result.vendorCompliance).toBe(0);
    });

    it('single pillar with items → other pillars at 0', () => {
      const items: ScoringItem[] = [
        { id: '1', name: 'Temp logs', pillar: 'foodSafety', status: 'compliant' },
        { id: '2', name: 'Checklists', pillar: 'foodSafety', status: 'compliant' },
      ];
      const result = computeComplianceScore(items, 'loc1');
      expect(result.foodSafety).toBe(100);
      expect(result.fireSafety).toBe(0);
      expect(result.vendorCompliance).toBe(0);
      // overall = 100*0.45 + 0*0.35 + 0*0.20 = 45
      expect(result.overall).toBe(45);
    });

    it('returns correct pillar breakdown with labels', () => {
      const items: ScoringItem[] = [
        { id: '1', name: 'Test', pillar: 'foodSafety', status: 'compliant' },
        { id: '2', name: 'Test', pillar: 'fireSafety', status: 'compliant' },
        { id: '3', name: 'Test', pillar: 'vendorCompliance', status: 'compliant' },
      ];
      const result = computeComplianceScore(items, 'loc1');
      expect(result.pillars).toHaveLength(3);
      expect(result.pillars[0].label).toBe('Food Safety');
      expect(result.pillars[1].label).toBe('Fire Safety');
      expect(result.pillars[2].label).toBe('Vendor Compliance');
    });

    it('pending items count as non-compliant', () => {
      const items: ScoringItem[] = [
        { id: '1', name: 'Temp logs', pillar: 'foodSafety', status: 'compliant' },
        { id: '2', name: 'Checklists', pillar: 'foodSafety', status: 'pending' },
      ];
      const result = computeComplianceScore(items, 'loc1');
      // 1 compliant / 2 applicable = 50%
      expect(result.foodSafety).toBe(50);
    });
  });

  // ─── computeWeightedOverall ───────────────────────────
  describe('computeWeightedOverall', () => {
    it('computes correct weighted sum with default weights', () => {
      const result = computeWeightedOverall({
        foodSafety: 100,
        fireSafety: 100,
        vendorCompliance: 100,
      });
      expect(result).toBe(100);
    });

    it('computes correct weighted sum with mixed scores', () => {
      const result = computeWeightedOverall({
        foodSafety: 80,
        fireSafety: 60,
        vendorCompliance: 40,
      });
      // 80*0.45 + 60*0.35 + 40*0.20 = 36 + 21 + 8 = 65
      expect(result).toBe(65);
    });
  });

  // ─── calculateFoodSafetyScore ─────────────────────────
  describe('calculateFoodSafetyScore', () => {
    it('perfect scores → 100', () => {
      const result = calculateFoodSafetyScore({
        tempCheckCompletionRate: 100,
        checklistCompletionRate: 100,
        incidentResolutionAvgHours: 1,
        haccpMonitoringRate: 100,
      });
      expect(result).toBe(100);
    });

    it('all zeros → 0', () => {
      const result = calculateFoodSafetyScore({
        tempCheckCompletionRate: 0,
        checklistCompletionRate: 0,
        incidentResolutionAvgHours: -1,
        haccpMonitoringRate: 0,
      });
      expect(result).toBe(0);
    });
  });

  // ─── calculateFireSafetyScore ─────────────────────────
  describe('calculateFireSafetyScore', () => {
    it('all items current → 100', () => {
      const result = calculateFireSafetyScore([
        { name: 'Hood Cleaning', weight: 0.30, daysUntilDue: 60 },
        { name: 'Fire Suppression', weight: 0.25, daysUntilDue: 90 },
        { name: 'Fire Extinguisher', weight: 0.20, daysUntilDue: 120 },
        { name: 'Grease Trap', weight: 0.15, daysUntilDue: 45 },
        { name: 'Exhaust', weight: 0.10, daysUntilDue: 60 },
      ]);
      expect(result).toBe(100);
    });

    it('all items overdue → 0', () => {
      const result = calculateFireSafetyScore([
        { name: 'Hood Cleaning', weight: 0.30, daysUntilDue: -10 },
        { name: 'Fire Suppression', weight: 0.25, daysUntilDue: -5 },
        { name: 'Fire Extinguisher', weight: 0.20, daysUntilDue: -30 },
        { name: 'Grease Trap', weight: 0.15, daysUntilDue: -15 },
        { name: 'Exhaust', weight: 0.10, daysUntilDue: -20 },
      ]);
      expect(result).toBe(0);
    });
  });

  // ─── calculateVendorComplianceScore ───────────────────
  describe('calculateVendorComplianceScore', () => {
    it('all documents current → 100', () => {
      const result = calculateVendorComplianceScore([
        { name: 'Vendor Certs', weight: 0.40, daysUntilExpiry: 90, count: 5, expiredCount: 0 },
        { name: 'Insurance', weight: 0.30, daysUntilExpiry: 120 },
        { name: 'Service Records', weight: 0.30, daysUntilExpiry: 60 },
      ]);
      expect(result).toBe(100);
    });

    it('expired vendor certs reduce score', () => {
      const result = calculateVendorComplianceScore([
        { name: 'Vendor Certs', weight: 0.40, daysUntilExpiry: 90, count: 4, expiredCount: 2 },
        { name: 'Insurance', weight: 0.30, daysUntilExpiry: 120 },
        { name: 'Service Records', weight: 0.30, daysUntilExpiry: 60 },
      ]);
      expect(result).toBeLessThan(100);
      expect(result).toBeGreaterThan(0);
    });
  });
});
