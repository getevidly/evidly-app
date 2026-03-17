/**
 * streakTracker — MOBILE-EMOTIONAL-01
 *
 * Tracks daily action streaks in localStorage.
 * Returns the new streak count after increment.
 * Streak resets if a calendar day is skipped.
 */

const STORAGE_PREFIX = 'evidly_streak_';

interface StreakData {
  count: number;
  lastDate: string; // YYYY-MM-DD
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function incrementStreak(actionType: string): number {
  const key = `${STORAGE_PREFIX}${actionType}`;
  const today = todayKey();

  try {
    const raw = localStorage.getItem(key);
    const data: StreakData = raw ? JSON.parse(raw) : { count: 0, lastDate: '' };

    if (data.lastDate === today) {
      // Already counted today — return current streak
      return data.count;
    }

    // Check if yesterday was the last date (streak continues)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const newCount = data.lastDate === yesterdayKey ? data.count + 1 : 1;
    const updated: StreakData = { count: newCount, lastDate: today };
    localStorage.setItem(key, JSON.stringify(updated));

    return newCount;
  } catch {
    return 1;
  }
}

export function getStreak(actionType: string): number {
  const key = `${STORAGE_PREFIX}${actionType}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const data: StreakData = JSON.parse(raw);
    // Stale streak (more than 1 day ago)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const today = todayKey();
    if (data.lastDate !== today && data.lastDate !== yesterdayKey) return 0;
    return data.count;
  } catch {
    return 0;
  }
}

export const STREAK_MILESTONES = [5, 10, 30, 50, 100];
