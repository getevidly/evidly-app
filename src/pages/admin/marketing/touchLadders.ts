// Adjustable: touch-type follow-up ladders (days) and parking interval
export const TOUCH_LADDERS: Record<string, number[]> = {
  call:      [3, 7, 21, 60],
  email:     [5, 14, 45],
  in_person: [4, 14, 45],
  show:      [2, 7, 21, 60],
  other:     [7, 21, 60],
};
export const PARK_DAYS = 90;

/** Returns today + `days` as a YYYY-MM-DD string. */
export function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
