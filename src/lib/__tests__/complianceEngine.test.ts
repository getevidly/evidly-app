import { describe, it, expect } from 'vitest';
import {
  calculateFoodSafetyScore,
  incidentResolutionScore,
  calculateFacilitySafetyScore,
  buildFacilitySafetyItems,
} from '../complianceScoring';
import {
  collectComplianceData,
  collectAllDemoData,
  getCountyForLocation,
} from '../complianceDataCollector';
import {
  computeComplianceSnapshot,
  computeAllSnapshots,
  computeOrgScores,
  deriveScoreImpactItems,
} from '../complianceEngine';

// ─── incidentResolutionScore ─────────────────────────────────

describe('incidentResolutionScore', () => {
  it('≤2 hours → 100', () => {
    expect(incidentResolutionScore(1.5)).toBe(100);
    expect(incidentResolutionScore(2)).toBe(100);
  });

  it('24 hours → approximately 52', () => {
    const score = incidentResolutionScore(24);
    expect(score).toBeGreaterThan(45);
    expect(score).toBeLessThan(55);
  });

  it('≥48 hours → 0', () => {
    expect(incidentResolutionScore(48)).toBe(0);
    expect(incidentResolutionScore(72)).toBe(0);
  });

  it('-1 (unresolved) → 20', () => {
    expect(incidentResolutionScore(-1)).toBe(20);
  });
});

// ─── calculateFoodSafetyScore ────────────────────────────────

describe('calculateFoodSafetyScore', () => {
  it('perfect inputs → 100', () => {
    const score = calculateFoodSafetyScore(
      {
        tempCheckCompletionRate: 100,
        checklistCompletionRate: 100,
        haccpMonitoringRate: 100,
        incidentResolutionAvgHours: 1,
      },
      100,
    );
    expect(score).toBe(100);
  });

  it('all zeros → low score', () => {
    const score = calculateFoodSafetyScore(
      {
        tempCheckCompletionRate: 0,
        checklistCompletionRate: 0,
        haccpMonitoringRate: 0,
        incidentResolutionAvgHours: 48,
      },
      0,
    );
    expect(score).toBe(0);
  });

  it('clamps to 0-100', () => {
    const score = calculateFoodSafetyScore(
      {
        tempCheckCompletionRate: 200,
        checklistCompletionRate: 200,
        haccpMonitoringRate: 200,
        incidentResolutionAvgHours: 0,
      },
      200,
    );
    expect(score).toBe(100);
  });

  it('unresolved incidents lower the score', () => {
    const resolved = calculateFoodSafetyScore(
      {
        tempCheckCompletionRate: 90,
        checklistCompletionRate: 90,
        haccpMonitoringRate: 90,
        incidentResolutionAvgHours: 1,
      },
      90,
    );
    const unresolved = calculateFoodSafetyScore(
      {
        tempCheckCompletionRate: 90,
        checklistCompletionRate: 90,
        haccpMonitoringRate: 90,
        incidentResolutionAvgHours: -1,
      },
      90,
    );
    expect(resolved).toBeGreaterThan(unresolved);
  });

  it('omitting documentation rate defaults to 100', () => {
    const withDoc = calculateFoodSafetyScore(
      {
        tempCheckCompletionRate: 90,
        checklistCompletionRate: 90,
        haccpMonitoringRate: 90,
        incidentResolutionAvgHours: 2,
      },
      100,
    );
    const withoutDoc = calculateFoodSafetyScore({
      tempCheckCompletionRate: 90,
      checklistCompletionRate: 90,
      haccpMonitoringRate: 90,
      incidentResolutionAvgHours: 2,
    });
    expect(withDoc).toBe(withoutDoc);
  });
});

// ─── complianceDataCollector ─────────────────────────────────

describe('complianceDataCollector', () => {
  it('collectComplianceData returns valid snapshot for downtown', () => {
    const snapshot = collectComplianceData('downtown', { isDemoMode: true });
    expect(snapshot.locationId).toBe('downtown');
    expect(snapshot.countySlug).toBe('fresno');
    expect(snapshot.collectedAt).toBeTruthy();
    expect(snapshot.temp.complianceRate).toBeGreaterThan(0);
    expect(snapshot.checklists.completionRate).toBeGreaterThan(0);
  });

  it('collectAllDemoData returns all 3 locations', () => {
    const all = collectAllDemoData();
    expect(Object.keys(all)).toHaveLength(3);
    expect(all.downtown).toBeTruthy();
    expect(all.airport).toBeTruthy();
    expect(all.university).toBeTruthy();
  });

  it('unknown location returns empty snapshot', () => {
    const snapshot = collectComplianceData('nonexistent');
    expect(snapshot.locationId).toBe('nonexistent');
    expect(snapshot.temp.totalLogs).toBe(0);
  });

  it('getCountyForLocation returns correct counties', () => {
    expect(getCountyForLocation('downtown')).toBe('fresno');
    expect(getCountyForLocation('airport')).toBe('merced');
    expect(getCountyForLocation('university')).toBe('stanislaus');
    expect(getCountyForLocation('unknown')).toBe('generic');
  });
});

// ─── complianceEngine ────────────────────────────────────────

describe('complianceEngine', () => {
  describe('computeComplianceSnapshot', () => {
    it('downtown yields food≈96, facility≈92', () => {
      const snapshot = collectComplianceData('downtown', { isDemoMode: true });
      const result = computeComplianceSnapshot('downtown', snapshot, 'fresno');

      expect(result.locationId).toBe('downtown');
      expect(result.engineVersion).toBe('2.0');
      expect(result.foodSafetyScore).toBeGreaterThanOrEqual(93);
      expect(result.foodSafetyScore).toBeLessThanOrEqual(99);
      expect(result.facilitySafetyScore).toBeGreaterThanOrEqual(89);
      expect(result.facilitySafetyScore).toBeLessThanOrEqual(95);
    });

    it('airport yields food≈84, facility≈79', () => {
      const snapshot = collectComplianceData('airport', { isDemoMode: true });
      const result = computeComplianceSnapshot('airport', snapshot, 'merced');

      expect(result.foodSafetyScore).toBeGreaterThanOrEqual(81);
      expect(result.foodSafetyScore).toBeLessThanOrEqual(87);
      expect(result.facilitySafetyScore).toBeGreaterThanOrEqual(76);
      expect(result.facilitySafetyScore).toBeLessThanOrEqual(82);
    });

    it('university yields food≈72, facility≈64', () => {
      const snapshot = collectComplianceData('university', { isDemoMode: true });
      const result = computeComplianceSnapshot('university', snapshot, 'stanislaus');

      expect(result.foodSafetyScore).toBeGreaterThanOrEqual(69);
      expect(result.foodSafetyScore).toBeLessThanOrEqual(75);
      expect(result.facilitySafetyScore).toBeGreaterThanOrEqual(61);
      expect(result.facilitySafetyScore).toBeLessThanOrEqual(67);
    });

    it('has valid sub-scores (ops and docs)', () => {
      const snapshot = collectComplianceData('downtown', { isDemoMode: true });
      const result = computeComplianceSnapshot('downtown', snapshot, 'fresno');

      expect(result.foodSafetyOps).toBeGreaterThan(0);
      expect(result.foodSafetyOps).toBeLessThanOrEqual(100);
      expect(result.foodSafetyDocs).toBe(94); // matches demo data
      expect(result.facilitySafetyOps).toBeGreaterThan(0);
      expect(result.facilitySafetyDocs).toBe(95); // matches demo data
    });

    it('includes jurisdiction result', () => {
      const snapshot = collectComplianceData('downtown', { isDemoMode: true });
      const result = computeComplianceSnapshot('downtown', snapshot, 'fresno');

      expect(result.jurisdictionResult).toBeTruthy();
      expect(result.jurisdictionResult.numericScore).toBeDefined();
    });
  });

  describe('computeAllSnapshots', () => {
    it('computes all 3 locations', () => {
      const snapshots = collectAllDemoData();
      const results = computeAllSnapshots(snapshots);

      expect(Object.keys(results)).toHaveLength(3);
      expect(results.downtown.foodSafetyScore).toBeGreaterThan(results.university.foodSafetyScore);
    });
  });

  describe('computeOrgScores', () => {
    it('averages location scores', () => {
      const snapshots = collectAllDemoData();
      const results = computeAllSnapshots(snapshots);
      const org = computeOrgScores(results);

      expect(org.foodSafety).toBeGreaterThan(0);
      expect(org.facilitySafety).toBeGreaterThan(0);

      // Org should be between highest and lowest location
      expect(org.foodSafety).toBeLessThanOrEqual(results.downtown.foodSafetyScore);
      expect(org.foodSafety).toBeGreaterThanOrEqual(results.university.foodSafetyScore);
    });

    it('empty results → zero scores', () => {
      const org = computeOrgScores({});
      expect(org.foodSafety).toBe(0);
    });
  });

  describe('deriveScoreImpactItems', () => {
    it('generates items for downtown', () => {
      const snapshot = collectComplianceData('downtown', { isDemoMode: true });
      const items = deriveScoreImpactItems(snapshot, 'downtown');

      expect(items.length).toBeGreaterThanOrEqual(10);

      // All items should have required fields
      for (const item of items) {
        expect(item.status).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.pillar).toMatch(/^(Food Safety|Fire Safety)$/);
        expect(item.locationId).toBe('1'); // downtown → numeric '1'
      }
    });

    it('downtown items are mostly current (good scores)', () => {
      const snapshot = collectComplianceData('downtown', { isDemoMode: true });
      const items = deriveScoreImpactItems(snapshot, 'downtown');
      const currentCount = items.filter((i) => i.status === 'current').length;

      expect(currentCount).toBeGreaterThan(items.length / 2);
    });

    it('university items include overdue/expired items', () => {
      const snapshot = collectComplianceData('university', { isDemoMode: true });
      const items = deriveScoreImpactItems(snapshot, 'university');
      const badStatuses = items.filter(
        (i) => i.status === 'overdue' || i.status === 'expired' || i.status === 'due_soon',
      );

      expect(badStatuses.length).toBeGreaterThan(0);
    });

    it('items have labels containing known violation patterns', () => {
      const snapshot = collectComplianceData('downtown', { isDemoMode: true });
      const items = deriveScoreImpactItems(snapshot, 'downtown');
      const labels = items.map((i) => i.label.toLowerCase());

      // At least these patterns should appear in labels
      expect(labels.some((l) => l.includes('temperature'))).toBe(true);
      expect(labels.some((l) => l.includes('checklist'))).toBe(true);
      expect(labels.some((l) => l.includes('haccp'))).toBe(true);
      expect(labels.some((l) => l.includes('hood cleaning'))).toBe(true);
      expect(labels.some((l) => l.includes('fire suppression'))).toBe(true);
    });

    it('action items have action links', () => {
      const snapshot = collectComplianceData('university', { isDemoMode: true });
      const items = deriveScoreImpactItems(snapshot, 'university');
      const withAction = items.filter((i) => i.action !== null);

      for (const item of withAction) {
        expect(item.actionLink).toBeTruthy();
        expect(item.actionLink!.startsWith('/')).toBe(true);
      }
    });
  });
});
