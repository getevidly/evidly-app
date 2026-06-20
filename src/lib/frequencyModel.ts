/**
 * Canonical frequency label ↔ day-count map for location_service_schedules.
 * The `frequency` column stores the label; `frequency_interval_days` stores the integer.
 */

export const FREQUENCY_MAP: Record<string, number> = {
  Monthly: 30,
  'Every 2 Months': 60,
  Quarterly: 90,
  'Semi-Annual': 180,
  Annual: 365,
};

export const FREQUENCY_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Monthly', days: 30 },
  { label: 'Every 2 Months', days: 60 },
  { label: 'Quarterly', days: 90 },
  { label: 'Semi-Annual', days: 180 },
  { label: 'Annual', days: 365 },
  { label: 'Other', days: null },
];
