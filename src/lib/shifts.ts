// ── Canonical Shift Definitions ─────────────────────────────────────
// Single source of truth for shift keys, labels, and hour boundaries.
// All shift-related code imports from here.

export type ShiftKey = 'morning' | 'afternoon' | 'evening';

export const SHIFT_KEYS: ShiftKey[] = ['morning', 'afternoon', 'evening'];

export const DEFAULT_SHIFTS: Record<ShiftKey, { label: string; startHour: number; endHour: number }> = {
  morning:   { label: 'Morning',   startHour: 5,  endHour: 12 },
  afternoon: { label: 'Afternoon', startHour: 12, endHour: 17 },
  evening:   { label: 'Evening',   startHour: 17, endHour: 23 },
};

/** Derive current shift from wall-clock hour */
export function getCurrentShift(): ShiftKey {
  const hour = new Date().getHours();
  if (hour < DEFAULT_SHIFTS.morning.endHour) return 'morning';
  if (hour < DEFAULT_SHIFTS.afternoon.endHour) return 'afternoon';
  return 'evening';
}

/** Human-readable label for a shift key */
export function getShiftLabel(shift: string): string {
  const def = DEFAULT_SHIFTS[shift as ShiftKey];
  return def?.label ?? shift.charAt(0).toUpperCase() + shift.slice(1);
}

// ── Day-of-Week Pattern Adapters ────────────────────────────────────
// shift_templates.day_of_week_pattern uses 'MTWRFSU' (Mon→Sun).
// ShiftConfig.days uses boolean[7] indexed [Sun=0, Mon=1 … Sat=6].

const PATTERN_CHARS = ['U', 'M', 'T', 'W', 'R', 'F', 'S'] as const;
const PATTERN_ORDER = 'MTWRFSU';

/** Convert 'MTWRFSU' pattern to boolean[7] (Sun=0 … Sat=6) */
export function dayPatternToBooleans(pattern: string): boolean[] {
  return PATTERN_CHARS.map(c => pattern.includes(c));
}

/** Convert boolean[7] (Sun=0 … Sat=6) to 'MTWRFSU' pattern */
export function booleansToDayPattern(days: boolean[]): string {
  const active = new Set(days.map((d, i) => d ? PATTERN_CHARS[i] : '').filter(Boolean));
  return PATTERN_ORDER.split('').filter(c => active.has(c)).join('');
}
