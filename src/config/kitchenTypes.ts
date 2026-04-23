/**
 * Canonical kitchen type registry — single source of truth.
 * All 14 values match the locations.kitchen_type column in the database.
 *
 * Usage:
 *   import { KITCHEN_TYPES, type KitchenType } from '../config/kitchenTypes';
 */

export const KITCHEN_TYPE_VALUES = [
  'restaurant',
  'hotel_resort',
  'healthcare_facility',
  'senior_living',
  'k12_school',
  'higher_education',
  'corporate_cafeteria',
  'food_truck',
  'catering',
  'ghost_kitchen',
  'bar_nightclub',
  'convention_center',
  'sports_venue',
  'casino',
] as const;

export type KitchenType = (typeof KITCHEN_TYPE_VALUES)[number];

export interface KitchenTypeEntry {
  value: KitchenType;
  label: string;
}

/**
 * Full list with display labels — use for dropdowns, filters, admin views.
 */
export const KITCHEN_TYPES: KitchenTypeEntry[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel_resort', label: 'Hotel/Resort' },
  { value: 'healthcare_facility', label: 'Healthcare Facility' },
  { value: 'senior_living', label: 'Senior Living' },
  { value: 'k12_school', label: 'K-12 School' },
  { value: 'higher_education', label: 'Higher Education' },
  { value: 'corporate_cafeteria', label: 'Corporate Cafeteria' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'catering', label: 'Catering' },
  { value: 'ghost_kitchen', label: 'Ghost Kitchen' },
  { value: 'bar_nightclub', label: 'Bar/Nightclub' },
  { value: 'convention_center', label: 'Convention Center' },
  { value: 'sports_venue', label: 'Sports Venue' },
  { value: 'casino', label: 'Casino' },
];

/** Map from DB value to display label. */
export const KITCHEN_TYPE_LABELS: Record<KitchenType, string> = Object.fromEntries(
  KITCHEN_TYPES.map(t => [t.value, t.label]),
) as Record<KitchenType, string>;

/** Given a display label (e.g. "K-12 School"), return the DB value (e.g. "k12_school"). */
export function labelToKitchenType(label: string): KitchenType | null {
  const entry = KITCHEN_TYPES.find(t => t.label === label);
  return entry?.value ?? null;
}
