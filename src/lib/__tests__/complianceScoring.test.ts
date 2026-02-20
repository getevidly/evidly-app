import { describe, it, expect } from 'vitest';
import {
  calculateFireSafetyScore,
  getScoreColor,
  getScoreStatus,
  getScoreInfo,
  getGraduatedPenalty,
  DEFAULT_WEIGHTS,
} from '../complianceScoring';

describe('complianceScoring', () => {
  // ─── PILLAR_WEIGHTS ───────────────────────────────────
  describe('DEFAULT_WEIGHTS', () => {
    it('Food Safety + Fire Safety weights sum to 1.0', () => {
      const sum = DEFAULT_WEIGHTS.foodSafety + DEFAULT_WEIGHTS.fireSafety;
      expect(sum).toBeCloseTo(1.0);
    });

    it('Food Safety = 55%, Fire Safety = 45%', () => {
      expect(DEFAULT_WEIGHTS.foodSafety).toBe(0.55);
      expect(DEFAULT_WEIGHTS.fireSafety).toBe(0.45);
    });
  });

  // ─── getScoreColor ─────────────────────────────────────
  describe('getScoreColor', () => {
    it('90+ → green', () => expect(getScoreColor(90)).toBe('#22c55e'));
    it('75+ → yellow', () => expect(getScoreColor(80)).toBe('#eab308'));
    it('60+ → amber', () => expect(getScoreColor(65)).toBe('#f59e0b'));
    it('<60 → red', () => expect(getScoreColor(50)).toBe('#ef4444'));
  });

  // ─── getScoreStatus ────────────────────────────────────
  describe('getScoreStatus', () => {
    it('90+ → Excellent', () => expect(getScoreStatus(95)).toBe('Excellent'));
    it('75+ → Good', () => expect(getScoreStatus(80)).toBe('Good'));
    it('60+ → Needs Attention', () => expect(getScoreStatus(65)).toBe('Needs Attention'));
    it('<60 → Critical', () => expect(getScoreStatus(50)).toBe('Critical'));
  });

  // ─── getScoreInfo ──────────────────────────────────────
  describe('getScoreInfo', () => {
    it('returns label, color, and hex', () => {
      const info = getScoreInfo(85);
      expect(info.label).toBe('Good');
      expect(info.color).toBe('yellow');
      expect(info.hex).toBe('#eab308');
    });
  });

  // ─── getGraduatedPenalty ───────────────────────────────
  describe('getGraduatedPenalty', () => {
    it('expired → full penalty', () => expect(getGraduatedPenalty(-5, 100)).toBe(100));
    it('1-7 days → 50% penalty', () => expect(getGraduatedPenalty(3, 100)).toBe(50));
    it('8-14 days → 30% penalty', () => expect(getGraduatedPenalty(10, 100)).toBe(30));
    it('15-30 days → 15% penalty', () => expect(getGraduatedPenalty(20, 100)).toBe(15));
    it('30+ days → 0% penalty', () => expect(getGraduatedPenalty(60, 100)).toBe(0));
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

    it('condition-based items use conditionScore', () => {
      const result = calculateFireSafetyScore([
        { name: 'Daily Checks', weight: 1.0, daysUntilDue: Infinity, conditionScore: 80 },
      ]);
      expect(result).toBe(80);
    });
  });
});
