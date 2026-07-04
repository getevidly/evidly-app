// Shared elapsed-day count: whole 24-hour periods since `iso`.
// One source of truth for "N days running / Nd late / Nd ago" across the
// dashboard and notifications. Floor, so ~19.5 days reads 19 (never rounds up);
// clamped at 0 for future/clock-skew; 0 for invalid input.
export function daysSince(iso: string | Date): number {
  const then = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(then.getTime())) return 0;
  const ms = Date.now() - then.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
