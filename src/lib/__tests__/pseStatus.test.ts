import { describe, it, expect } from 'vitest';
import { calculatePSEStatus } from '../pseStatus';

describe('calculatePSEStatus', () => {
  it('returns current when today is before nextDue', () => {
    expect(calculatePSEStatus(new Date('2026-03-15'), new Date('2026-03-14'))).toBe('current');
  });

  it('returns overdue when today equals nextDue', () => {
    expect(calculatePSEStatus(new Date('2026-03-15'), new Date('2026-03-15'))).toBe('overdue');
  });

  it('returns overdue when today is past nextDue but in the same calendar month', () => {
    expect(calculatePSEStatus(new Date('2026-03-15'), new Date('2026-03-31'))).toBe('overdue');
  });

  it('returns at_risk when today rolls into the next calendar month', () => {
    expect(calculatePSEStatus(new Date('2026-03-15'), new Date('2026-04-01'))).toBe('at_risk');
  });

  it('returns at_risk when nextDue was on the last day of a month and today is the next day', () => {
    expect(calculatePSEStatus(new Date('2026-03-31'), new Date('2026-04-01'))).toBe('at_risk');
  });

  it('returns at_risk months past nextDue', () => {
    expect(calculatePSEStatus(new Date('2026-01-15'), new Date('2026-06-15'))).toBe('at_risk');
  });

  it('handles year boundary — overdue within December', () => {
    expect(calculatePSEStatus(new Date('2025-12-15'), new Date('2025-12-20'))).toBe('overdue');
  });

  it('handles year boundary — at_risk in January after December due date', () => {
    expect(calculatePSEStatus(new Date('2025-12-15'), new Date('2026-01-01'))).toBe('at_risk');
  });
});
