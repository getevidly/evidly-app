/**
 * NFPA 96-2024 Table 12.4 — Hood Cleaning Frequency Map
 *
 * Determines required kitchen exhaust system cleaning frequency
 * based on cooking type / volume. This is the canonical source
 * for cleaning frequency logic throughout the application.
 */

export const NFPA96_TABLE_12_4 = {
  solid_fuel:         'monthly',      // Solid fuel (charcoal, wood, mesquite)
  high_volume_wok:    'monthly',      // High-volume wok cooking
  high_volume:        'quarterly',    // High-volume cooking (24hr, high grease)
  moderate_volume:    'semiannual',   // Moderate volume (grilling, sautéing)
  low_volume:         'annual',       // Low volume (churches, seasonal, day camps)
  pizza_oven_electric:'annual',       // Passover/holiday only, electric pizza ovens
} as const;

export type CookingType = keyof typeof NFPA96_TABLE_12_4;
export type CleaningFrequency = (typeof NFPA96_TABLE_12_4)[CookingType];

const FREQUENCY_LABELS: Record<CleaningFrequency, string> = {
  monthly:    'Monthly',
  quarterly:  'Quarterly',
  semiannual: 'Semi-Annually',
  annual:     'Annually',
};

const FREQUENCY_MONTHS: Record<CleaningFrequency, number> = {
  monthly:    1,
  quarterly:  3,
  semiannual: 6,
  annual:     12,
};

export const COOKING_TYPE_OPTIONS: { value: CookingType; label: string }[] = [
  { value: 'solid_fuel',          label: 'Solid Fuel (wood, charcoal, mesquite) — Monthly' },
  { value: 'high_volume_wok',     label: 'High-Volume Wok Cooking — Monthly' },
  { value: 'high_volume',         label: 'High-Volume (24hr, high grease) — Quarterly' },
  { value: 'moderate_volume',     label: 'Moderate Volume (grilling, sautéing) — Semi-Annually' },
  { value: 'low_volume',          label: 'Low Volume (steam, baking, light cooking) — Annually' },
  { value: 'pizza_oven_electric', label: 'Electric Pizza Oven / Seasonal — Annually' },
];

export function getCleaningFrequency(cookingType: string): CleaningFrequency {
  if (cookingType in NFPA96_TABLE_12_4) {
    return NFPA96_TABLE_12_4[cookingType as CookingType];
  }
  return 'semiannual';
}

export function getFrequencyLabel(freq: CleaningFrequency): string {
  return FREQUENCY_LABELS[freq];
}

export function getNextDueDate(lastServiceDate: Date, cookingType: string): Date {
  const freq = getCleaningFrequency(cookingType);
  const months = FREQUENCY_MONTHS[freq];
  const next = new Date(lastServiceDate);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function getServiceStatus(
  lastServiceDate: Date | null,
  cookingType: string
): 'current' | 'due_soon' | 'overdue' | 'unknown' {
  if (!lastServiceDate) return 'unknown';
  const nextDue = getNextDueDate(lastServiceDate, cookingType);
  const now = new Date();
  const daysUntilDue = Math.floor(
    (nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 30) return 'due_soon';
  return 'current';
}
