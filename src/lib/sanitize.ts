/**
 * Input sanitization utilities for system-boundary validation.
 * Secondary defense — Supabase SDK already handles parameterized queries.
 */

/** Strip HTML angle brackets and trim to maxLength */
export function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
}

/** Accept only valid UUID v4 strings */
export function sanitizeId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input) ? input : null;
}

/** Accept only YYYY-MM-DD date strings that parse to valid dates */
export function sanitizeDateString(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const date = new Date(input + 'T00:00:00Z');
  return isNaN(date.getTime()) ? null : input;
}

/** Accept temperatures within commercial kitchen range (-60 to 500 °F), one decimal */
export function sanitizeTemperature(input: unknown): number | null {
  const num = parseFloat(String(input));
  if (isNaN(num) || num < -60 || num > 500) return null;
  return Math.round(num * 10) / 10;
}
