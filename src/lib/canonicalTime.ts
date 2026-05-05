/**
 * canonicalTime.ts -- Kitchen-local time helpers
 *
 * CANONICAL-LAYER-01-1E
 *
 * Problem: 24+ sites compute "today" or "start of day" using either:
 *   1. new Date().setHours(0,0,0,0)           -- browser-local midnight
 *   2. new Date().toISOString().split('T')[0]  -- UTC date string
 *   3. Hardcoded offsets                       -- fragile, DST-unaware
 *
 * All three are wrong when the user's browser timezone differs from the
 * kitchen's operational timezone (stored in organizations.timezone).
 *
 * Solution: Pure utility that computes dates in the kitchen's IANA timezone.
 * Uses Intl.DateTimeFormat (supported in all target browsers). Zero
 * dependencies. No React import. No Supabase import.
 *
 * Caller passes the timezone string; caching org timezone is caller's
 * responsibility. DST-safe via iterative offset verification.
 */

export type IanaTimezone = string;

// -- Public API ---------------------------------------------------------------

/**
 * Returns the current calendar date in the kitchen's timezone as 'YYYY-MM-DD'.
 * Uses Intl 'en-CA' locale which natively formats as ISO date.
 */
export function kitchenToday(tz: IanaTimezone, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/**
 * Returns a UTC ISO string representing midnight (00:00:00.000) of the kitchen's
 * current calendar day. Use for `.gte('column', kitchenStartOfDay(tz))` queries.
 */
export function kitchenStartOfDay(tz: IanaTimezone, at: Date = new Date()): string {
  const dateStr = kitchenToday(tz, at);
  const utcMidnight = new Date(dateStr + 'T00:00:00.000Z');
  const offsetMs = getOffsetMs(tz, utcMidnight);
  const candidate = new Date(utcMidnight.getTime() - offsetMs);
  // DST guard: offset at candidate may differ from offset at guess
  const verifyMs = getOffsetMs(tz, candidate);
  if (verifyMs !== offsetMs) {
    return new Date(utcMidnight.getTime() - verifyMs).toISOString();
  }
  return candidate.toISOString();
}

/**
 * Returns a UTC ISO string representing end-of-day (23:59:59.999) of the kitchen's
 * current calendar day. Use for `.lte('column', kitchenEndOfDay(tz))` queries.
 */
export function kitchenEndOfDay(tz: IanaTimezone, at: Date = new Date()): string {
  const dateStr = kitchenToday(tz, at);
  const utcEnd = new Date(dateStr + 'T23:59:59.999Z');
  const offsetMs = getOffsetMs(tz, utcEnd);
  const candidate = new Date(utcEnd.getTime() - offsetMs);
  const verifyMs = getOffsetMs(tz, candidate);
  if (verifyMs !== offsetMs) {
    return new Date(utcEnd.getTime() - verifyMs).toISOString();
  }
  return candidate.toISOString();
}

/**
 * Returns the current instant as a Date. Semantic passthrough -- callers that
 * import kitchenToday can also import kitchenNow for testability (mockable
 * single import vs scattered `new Date()` calls).
 */
export function kitchenNow(): Date {
  return new Date();
}

// -- Internal helpers ---------------------------------------------------------

/** Formatter cache -- avoids re-creating Intl.DateTimeFormat per call. */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function extractParts(tz: string, at: Date): DateParts {
  const parts = getFormatter(tz).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find(p => p.type === type)!.value, 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function partsToEpochMs(p: DateParts): number {
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * Computes UTC offset for a timezone at a given instant, in milliseconds.
 * Positive = ahead of UTC (e.g., +19800000 for Asia/Kolkata at +5:30).
 */
function getOffsetMs(tz: string, at: Date): number {
  const utcParts = extractParts('UTC', at);
  const tzParts = extractParts(tz, at);
  return partsToEpochMs(tzParts) - partsToEpochMs(utcParts);
}
