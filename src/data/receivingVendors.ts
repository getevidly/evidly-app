// ---------------------------------------------------------------------------
// Receiving Vendors — Seed list for the Receiving Temperature log vendor dropdown.
// Stored as config/seed data, NOT hardcoded in the component.
// Custom vendors added by users are stored in Supabase (location_custom_vendors)
// and merged at the top of the list sorted by most recently used.
// ---------------------------------------------------------------------------

export interface VendorEntry {
  name: string;
  category: VendorCategory;
}

export type VendorCategory =
  | 'broadline'
  | 'produce'
  | 'dairy'
  | 'beverage'
  | 'protein';

const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  broadline: 'Broadline Distributors',
  produce: 'Produce',
  dairy: 'Dairy',
  beverage: 'Beverage',
  protein: 'Protein',
};

/** Full seed list organized by category. */
export const SEED_VENDORS: VendorEntry[] = [
  // ── Broadline Distributors ──
  { name: 'Sysco', category: 'broadline' },
  { name: 'US Foods', category: 'broadline' },
  { name: 'Performance Food Group (PFG)', category: 'broadline' },
  { name: 'Gordon Food Service (GFS)', category: 'broadline' },
  { name: 'Restaurant Depot', category: 'broadline' },
  { name: 'Shamrock Foods', category: 'broadline' },
  { name: 'Nicholas & Company', category: 'broadline' },
  { name: 'Roma Foods', category: 'broadline' },
  { name: 'Reinhart Foodservice', category: 'broadline' },
  { name: 'Ben E. Keith', category: 'broadline' },
  { name: 'Cheney Brothers', category: 'broadline' },
  { name: 'Martin Bros.', category: 'broadline' },
  { name: 'McLane Foodservice', category: 'broadline' },

  // ── Produce ──
  { name: 'Fresh Point', category: 'produce' },
  { name: 'ProSource Produce', category: 'produce' },

  // ── Dairy ──
  { name: 'Darigold', category: 'dairy' },
  { name: 'Dairy Farmers of America', category: 'dairy' },

  // ── Beverage ──
  { name: 'Coca-Cola', category: 'beverage' },
  { name: 'Pepsi', category: 'beverage' },
  { name: 'Dr Pepper Beverages', category: 'beverage' },

  // ── Protein ──
  { name: 'Tyson Foods', category: 'protein' },
  { name: 'Cargill Meat Solutions', category: 'protein' },
];

/** Flat list of seed vendor names (alphabetically sorted). */
export const SEED_VENDOR_NAMES: string[] = SEED_VENDORS
  .map(v => v.name)
  .sort((a, b) => a.localeCompare(b));

/** Get the display label for a vendor category. */
export function getVendorCategoryLabel(category: VendorCategory): string {
  return VENDOR_CATEGORY_LABELS[category];
}

/** Look up a vendor entry by name. Returns undefined for custom vendors. */
export function findSeedVendor(name: string): VendorEntry | undefined {
  return SEED_VENDORS.find(v => v.name === name);
}
