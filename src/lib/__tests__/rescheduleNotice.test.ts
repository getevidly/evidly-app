import { describe, it, expect } from 'vitest';
import {
  calculateNoticeDays,
  businessDaysBetween,
  isWithinNoticeWindow,
} from '../rescheduleNotice';

describe('calculateNoticeDays', () => {
  it('returns the largest of the three values', () => {
    expect(calculateNoticeDays(3, 5, 2)).toBe(5);
  });

  it('treats null as 0', () => {
    expect(calculateNoticeDays(null, 5, null)).toBe(5);
  });

  it('treats undefined as 0', () => {
    expect(calculateNoticeDays(undefined, undefined, 7)).toBe(7);
  });

  it('returns 0 when all values are nullish', () => {
    expect(calculateNoticeDays(null, undefined, null)).toBe(0);
  });

  it('returns the value when all three are equal', () => {
    expect(calculateNoticeDays(3, 3, 3)).toBe(3);
  });

  it('zero is a valid threshold (no notice required)', () => {
    expect(calculateNoticeDays(0, 0, 0)).toBe(0);
  });
});

describe('businessDaysBetween', () => {
  it('counts weekdays only, excluding start and including end', () => {
    // Monday 2026-03-09 → Friday 2026-03-13: Tue, Wed, Thu, Fri = 4
    expect(businessDaysBetween(new Date('2026-03-09'), new Date('2026-03-13'))).toBe(4);
  });

  it('skips weekend in the middle of the range', () => {
    // Friday 2026-03-13 → Monday 2026-03-16: Sat, Sun skipped, Mon = 1
    expect(businessDaysBetween(new Date('2026-03-13'), new Date('2026-03-16'))).toBe(1);
  });

  it('returns 0 when end equals start', () => {
    expect(businessDaysBetween(new Date('2026-03-15'), new Date('2026-03-15'))).toBe(0);
  });

  it('returns 0 when end is before start', () => {
    expect(businessDaysBetween(new Date('2026-03-20'), new Date('2026-03-15'))).toBe(0);
  });

  it('counts a full Mon-Fri week as 5 business days', () => {
    // Sunday 2026-03-08 → Sunday 2026-03-15: Mon, Tue, Wed, Thu, Fri = 5
    expect(businessDaysBetween(new Date('2026-03-08'), new Date('2026-03-15'))).toBe(5);
  });
});

describe('isWithinNoticeWindow', () => {
  it('returns true when business-day count meets the threshold', () => {
    expect(isWithinNoticeWindow(new Date('2026-03-09'), new Date('2026-03-13'), 3)).toBe(true);
  });

  it('returns true when business-day count exactly equals the threshold', () => {
    expect(isWithinNoticeWindow(new Date('2026-03-09'), new Date('2026-03-13'), 4)).toBe(true);
  });

  it('returns false when business-day count falls below the threshold', () => {
    expect(isWithinNoticeWindow(new Date('2026-03-09'), new Date('2026-03-11'), 5)).toBe(false);
  });

  it('returns false when requested date is in the past', () => {
    expect(isWithinNoticeWindow(new Date('2026-03-15'), new Date('2026-03-10'), 1)).toBe(false);
  });
});
