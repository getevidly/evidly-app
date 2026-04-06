import { describe, it, expect } from 'vitest';
import {
  computeJurisdictionScore,
  gradeInspection,
  getScoringMethodLabel,
  getGradingFormatLabel,
  getTierLabel,
  getTierColor,
  type CompletedItem,
} from '../selfInspectionScoring';
import {
  getJurisdictionScoringConfig,
  getAllJurisdictionKeys,
  getJurisdictionCount,
} from '../../data/selfInspectionJurisdictionMap';
import { DEMO_JURISDICTIONS } from '../../data/demoJurisdictions';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeItems(
  counts: { pass?: number; critical?: number; major?: number; minor?: number; na?: number },
): CompletedItem[] {
  const items: CompletedItem[] = [];
  let idx = 0;
  for (let i = 0; i < (counts.pass ?? 0); i++) {
    items.push({ id: `item-${idx++}`, status: 'pass', severity: 'minor' });
  }
  for (let i = 0; i < (counts.critical ?? 0); i++) {
    items.push({ id: `item-${idx++}`, status: 'fail', severity: 'critical' });
  }
  for (let i = 0; i < (counts.major ?? 0); i++) {
    items.push({ id: `item-${idx++}`, status: 'fail', severity: 'major' });
  }
  for (let i = 0; i < (counts.minor ?? 0); i++) {
    items.push({ id: `item-${idx++}`, status: 'fail', severity: 'minor' });
  }
  for (let i = 0; i < (counts.na ?? 0); i++) {
    items.push({ id: `item-${idx++}`, status: 'na', severity: 'minor' });
  }
  return items;
}

function findDemoJurisdiction(county: string) {
  return DEMO_JURISDICTIONS.find((j) => j.county === county && !j.city);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selfInspectionScoring', () => {
  // ── 1. CalCode baseline scoring ────────────────────────────
  describe('CalCode baseline scoring', () => {
    it('perfect score = 100 with standard penalties', () => {
      const config = getJurisdictionScoringConfig('Fresno');
      const items = makeItems({ pass: 30 });
      const result = computeJurisdictionScore(items, config);
      expect(result.rawScore).toBe(100);
      expect(result.totalPenalty).toBe(0);
      expect(result.failCounts.critical).toBe(0);
    });

    it('counts failures correctly by severity', () => {
      const config = getJurisdictionScoringConfig('Fresno');
      const items = makeItems({ pass: 25, critical: 1, major: 2, minor: 3 });
      const result = computeJurisdictionScore(items, config);
      expect(result.failCounts.critical).toBe(1);
      expect(result.failCounts.major).toBe(2);
      expect(result.failCounts.minor).toBe(3);
      expect(result.totalEvaluated).toBe(31); // 25 + 1 + 2 + 3
    });

    it('skips NA and null items in evaluation count', () => {
      const config = getJurisdictionScoringConfig('Fresno');
      const items: CompletedItem[] = [
        { id: 'a', status: 'pass', severity: 'minor' },
        { id: 'b', status: 'na', severity: 'minor' },
        { id: 'c', status: null, severity: 'minor' },
      ];
      const result = computeJurisdictionScore(items, config);
      expect(result.totalEvaluated).toBe(1);
    });
  });

  // ── 2. LA County weighted deduction ────────────────────────
  describe('LA County weighted deduction', () => {
    it('produces 100-pt deductive score', () => {
      const config = getJurisdictionScoringConfig('Los Angeles');
      expect(config.scoringType).toBe('weighted_deduction');
      const items = makeItems({ pass: 30, major: 1, minor: 1 });
      const result = computeJurisdictionScore(items, config);
      // penalty = 1*major_weight + 1*minor_weight
      expect(result.rawScore).toBeLessThan(100);
      expect(result.rawScore).toBeGreaterThan(0);
      expect(result.scoringMethod).toBe('100-Point Deductive');
    });

    it('grades LA County score via gradeInspection', () => {
      const dj = findDemoJurisdiction('Los Angeles');
      expect(dj).toBeDefined();
      const gradeA = gradeInspection(95, dj!);
      expect(gradeA.grade).toBe('A');
      expect(gradeA.passFail).toBe('pass');

      const gradeB = gradeInspection(85, dj!);
      expect(gradeB.grade).toBe('B');
    });
  });

  // ── 3. Riverside strict — 88 = FAIL ────────────────────────
  describe('Riverside strict grading', () => {
    it('88 is FAIL in Riverside (A-only passes)', () => {
      const dj = findDemoJurisdiction('Riverside');
      expect(dj).toBeDefined();
      const grade = gradeInspection(88, dj!);
      expect(grade.passFail).toBe('fail');
    });

    it('91 is PASS in Riverside', () => {
      const dj = findDemoJurisdiction('Riverside');
      const grade = gradeInspection(91, dj!);
      expect(grade.passFail).toBe('pass');
    });
  });

  // ── 4. Merced point accumulation ───────────────────────────
  describe('Merced point accumulation', () => {
    it('uses point_accumulation scoring type', () => {
      const config = getJurisdictionScoringConfig('Merced');
      expect(config.scoringType).toBe('point_accumulation');
    });

    it('computes score with Merced penalty weights', () => {
      const config = getJurisdictionScoringConfig('Merced');
      const items = makeItems({ pass: 30, major: 2, minor: 3 });
      const result = computeJurisdictionScore(items, config);
      expect(result.rawScore).toBeLessThan(100);
      expect(result.scoringMethod).toBe('Point Accumulation');
    });

    it('grades as Good/Satisfactory/Unsatisfactory', () => {
      const dj = findDemoJurisdiction('Merced');
      expect(dj).toBeDefined();
      const grade = gradeInspection(95, dj!);
      expect(grade.grade).toBe('Good');
    });
  });

  // ── 5. SLO negative scoring ────────────────────────────────
  describe('SLO negative scoring', () => {
    it('uses numeric_score scoring type', () => {
      const config = getJurisdictionScoringConfig('San Luis Obispo');
      expect(config.scoringType).toBe('numeric_score');
    });
  });

  // ── 6. Kern custom threshold ───────────────────────────────
  describe('Kern custom threshold', () => {
    it('uses weighted_deduction scoring', () => {
      const config = getJurisdictionScoringConfig('Kern');
      expect(config.scoringType).toBe('weighted_deduction');
    });

    it('grades 74 as fail (closure at 75)', () => {
      const dj = findDemoJurisdiction('Kern');
      expect(dj).toBeDefined();
      const grade = gradeInspection(74, dj!);
      expect(grade.passFail).toBe('fail');
    });
  });

  // ── 7. Sacramento/Placer/Yolo GYR placard ──────────────────
  describe('GYR placard jurisdictions', () => {
    it('Sacramento uses major_violation_count', () => {
      const config = getJurisdictionScoringConfig('Sacramento');
      expect(config.scoringType).toBe('major_violation_count');
    });

    it('Placer uses color_placard', () => {
      const config = getJurisdictionScoringConfig('Placer');
      expect(config.scoringType).toBe('color_placard');
    });

    it('zero majors → high score', () => {
      const config = getJurisdictionScoringConfig('Sacramento');
      const items = makeItems({ pass: 30 });
      const result = computeJurisdictionScore(items, config);
      expect(result.rawScore).toBe(95);
      expect(result.scoringMethod).toBe('Major Violation Count');
    });

    it('multiple majors → low score', () => {
      const config = getJurisdictionScoringConfig('Sacramento');
      const items = makeItems({ pass: 20, major: 4 });
      const result = computeJurisdictionScore(items, config);
      expect(result.rawScore).toBe(50);
    });
  });

  // ── 8. Orange pass/reinspect ───────────────────────────────
  describe('Orange pass/reinspect', () => {
    it('uses major_minor_reinspect scoring', () => {
      const config = getJurisdictionScoringConfig('Orange');
      expect(config.scoringType).toBe('major_minor_reinspect');
    });

    it('no majors → pass (high score)', () => {
      const config = getJurisdictionScoringConfig('Orange');
      const items = makeItems({ pass: 30 });
      const result = computeJurisdictionScore(items, config);
      expect(result.rawScore).toBe(95);
      expect(result.scoringMethod).toBe('Pass / Reinspect');
    });

    it('uncorrected majors → lower score', () => {
      const config = getJurisdictionScoringConfig('Orange');
      const items = makeItems({ pass: 25, major: 3 });
      const result = computeJurisdictionScore(items, config);
      expect(result.rawScore).toBe(65); // 80 - 3*5
    });
  });

  // ── 9. Fresno violation report ─────────────────────────────
  describe('Fresno violation report', () => {
    it('uses violation_report scoring', () => {
      const config = getJurisdictionScoringConfig('Fresno');
      expect(config.scoringType).toBe('violation_report');
      expect(config.gradingType).toBe('violation_report_only');
    });

    it('grades based on major violation count (not letter grade)', () => {
      const dj = findDemoJurisdiction('Fresno');
      expect(dj).toBeDefined();
      // Fresno uses violation_report_only — 85 = no open majors = pass
      const gradePass = gradeInspection(85, dj!);
      expect(gradePass.grade).toBe('No Open Majors');
      expect(gradePass.passFail).toBe('pass');
      // score 70 = open majors = fail
      const gradeFail = gradeInspection(70, dj!);
      expect(gradeFail.passFail).toBe('fail');
    });
  });

  // ── 10. NPS FDA overlay ────────────────────────────────────
  describe('NPS/Mariposa jurisdiction', () => {
    it('Mariposa uses major_minor_reinspect', () => {
      const config = getJurisdictionScoringConfig('Mariposa');
      expect(config.scoringType).toBe('major_minor_reinspect');
      expect(config.gradingType).toBe('pass_reinspect');
    });

    it('has dual-jurisdiction variance note', () => {
      const config = getJurisdictionScoringConfig('Mariposa');
      expect(config.varianceNotes.length).toBeGreaterThan(0);
      expect(config.varianceNotes[0]).toContain('Dual jurisdiction');
    });
  });

  // ── 11. Long Beach independent ─────────────────────────────
  describe('Long Beach independent city', () => {
    it('is keyed separately from LA County', () => {
      const lb = getJurisdictionScoringConfig('Los Angeles', 'Long Beach');
      const la = getJurisdictionScoringConfig('Los Angeles');
      expect(lb.key).toBe('Los Angeles|Long Beach');
      expect(la.key).toBe('Los Angeles');
      expect(lb.agencyName).not.toBe(la.agencyName);
    });
  });

  // ── 12. Pasadena independent ───────────────────────────────
  describe('Pasadena independent city', () => {
    it('is keyed separately from LA County', () => {
      const pas = getJurisdictionScoringConfig('Los Angeles', 'Pasadena');
      expect(pas.key).toBe('Los Angeles|Pasadena');
      expect(pas.agencyName).toContain('Pasadena');
    });
  });

  // ── 13. All 62 jurisdictions produce valid score + grade ───
  describe('all 62 jurisdictions', () => {
    it('has exactly 62 jurisdictions configured', () => {
      expect(getJurisdictionCount()).toBe(62);
    });

    it('every jurisdiction produces valid score from clean items', () => {
      const keys = getAllJurisdictionKeys();
      for (const key of keys) {
        const config = key.includes('|')
          ? getJurisdictionScoringConfig(
              key.split('|')[0],
              key.split('|')[1],
            )
          : getJurisdictionScoringConfig(key);

        const items = makeItems({ pass: 30, major: 1, minor: 2 });
        const result = computeJurisdictionScore(items, config);

        expect(result.rawScore).toBeGreaterThanOrEqual(0);
        expect(result.rawScore).toBeLessThanOrEqual(100);
        expect(result.totalEvaluated).toBe(33);
        expect(result.failCounts.major).toBe(1);
        expect(result.failCounts.minor).toBe(2);
      }
    });
  });

  // ── Label helpers ──────────────────────────────────────────
  describe('label helpers', () => {
    it('getScoringMethodLabel returns correct labels', () => {
      expect(getScoringMethodLabel('weighted_deduction')).toBe('100-Point Deductive');
      expect(getScoringMethodLabel('point_accumulation')).toBe('Point Accumulation');
      expect(getScoringMethodLabel('major_violation_count')).toBe('Major Violation Count');
      expect(getScoringMethodLabel('unknown_type')).toBe('Violation Report');
    });

    it('getGradingFormatLabel returns correct labels', () => {
      expect(getGradingFormatLabel('letter_grade')).toBe('Letter Grade (A / B / C)');
      expect(getGradingFormatLabel('color_placard')).toBe('Green / Yellow / Red Placard');
      expect(getGradingFormatLabel('unknown_type')).toBe('No Grade');
    });

    it('getTierLabel returns correct tier names', () => {
      expect(getTierLabel(1)).toBe('Verified');
      expect(getTierLabel(2)).toBe('Standardized');
      expect(getTierLabel(3)).toBe('Estimated');
      expect(getTierLabel(4)).toBe('Minimal');
      expect(getTierLabel(99)).toBe('Unknown');
    });

    it('getTierColor returns CSS classes', () => {
      expect(getTierColor(1)).toContain('green');
      expect(getTierColor(2)).toContain('blue');
      expect(getTierColor(3)).toContain('yellow');
      expect(getTierColor(4)).toContain('gray');
    });
  });
});
