/**
 * VENDOR-SERVICES-BUILD-01 — Demo data for vendor service cost/frequency
 *
 * Demo-only constants. Zero DB reads in demo mode.
 * Maps to the same location IDs used in demoData.ts.
 */

export interface VendorServiceDemo {
  id: string;
  location_id: string;
  location_name: string;
  city: string;
  service_type: string;
  vendor_name: string;
  service_frequency: string;
  frequency_interval_days: number;
  cost_per_visit: number;
  cost_annual: number;
  last_service_date: string;
  next_service_date: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
}

export const VENDOR_DEMO_SERVICES: VendorServiceDemo[] = [
  {
    id: 'vs-demo-1',
    location_id: 'demo-loc-downtown',
    location_name: 'Downtown Kitchen',
    city: 'Fresno',
    service_type: 'Hood Cleaning',
    vendor_name: 'Cleaning Pros Plus',
    service_frequency: 'Quarterly',
    frequency_interval_days: 90,
    cost_per_visit: 320,
    cost_annual: 1280,
    last_service_date: '2025-12-10',
    next_service_date: '2026-03-10',
    contract_start_date: '2026-01-01',
    contract_end_date: '2026-12-31',
  },
  {
    id: 'vs-demo-2',
    location_id: 'demo-loc-downtown',
    location_name: 'Downtown Kitchen',
    city: 'Fresno',
    service_type: 'Fire Suppression',
    vendor_name: 'Valley Fire Systems',
    service_frequency: 'Semi-Annual',
    frequency_interval_days: 180,
    cost_per_visit: 450,
    cost_annual: 900,
    last_service_date: '2025-10-01',
    next_service_date: '2026-04-01',
    contract_start_date: '2025-10-01',
    contract_end_date: '2026-09-30',
  },
  {
    id: 'vs-demo-3',
    location_id: 'demo-loc-downtown',
    location_name: 'Downtown Kitchen',
    city: 'Fresno',
    service_type: 'Pest Control',
    vendor_name: 'Central Valley Pest',
    service_frequency: 'Monthly',
    frequency_interval_days: 30,
    cost_per_visit: 95,
    cost_annual: 1140,
    last_service_date: '2026-02-15',
    next_service_date: '2026-03-15',
    contract_start_date: '2026-01-01',
    contract_end_date: '2026-12-31',
  },
  {
    id: 'vs-demo-4',
    location_id: 'demo-loc-airport',
    location_name: 'Airport Concourse',
    city: 'Fresno',
    service_type: 'Hood Cleaning',
    vendor_name: 'Cleaning Pros Plus',
    service_frequency: 'Semi-Annual',
    frequency_interval_days: 180,
    cost_per_visit: 280,
    cost_annual: 560,
    last_service_date: '2025-09-20',
    next_service_date: '2026-03-20',
    contract_start_date: '2025-01-01',
    contract_end_date: '2026-12-31',
  },
  {
    id: 'vs-demo-5',
    location_id: 'demo-loc-airport',
    location_name: 'Airport Concourse',
    city: 'Fresno',
    service_type: 'Grease Trap',
    vendor_name: 'Valley Waste Solutions',
    service_frequency: 'Quarterly',
    frequency_interval_days: 90,
    cost_per_visit: 175,
    cost_annual: 700,
    last_service_date: '2025-11-30',
    next_service_date: '2026-02-28',
    contract_start_date: null,
    contract_end_date: null,
  },
  {
    id: 'vs-demo-6',
    location_id: 'demo-loc-university',
    location_name: 'University Dining',
    city: 'Fresno',
    service_type: 'Hood Cleaning',
    vendor_name: 'Cleaning Pros Plus',
    service_frequency: 'Quarterly',
    frequency_interval_days: 90,
    cost_per_visit: 320,
    cost_annual: 1280,
    last_service_date: '2026-01-05',
    next_service_date: '2026-04-05',
    contract_start_date: '2026-01-01',
    contract_end_date: '2026-12-31',
  },
  {
    id: 'vs-demo-7',
    location_id: 'demo-loc-university',
    location_name: 'University Dining',
    city: 'Fresno',
    service_type: 'HVAC / Ventilation',
    vendor_name: 'Central Air Services',
    service_frequency: 'Annual',
    frequency_interval_days: 365,
    cost_per_visit: 890,
    cost_annual: 890,
    last_service_date: '2025-06-01',
    next_service_date: '2026-06-01',
    contract_start_date: '2025-06-01',
    contract_end_date: '2026-06-30',
  },
];

// ── Derived helpers ─────────────────────────────────────────

const VISITS_PER_YEAR: Record<string, number> = {
  Monthly: 12,
  Quarterly: 4,
  'Semi-Annual': 2,
  Annual: 1,
  'As Needed': 1,
};

/** Total annual spend across all demo services */
export function getDemoAnnualSpend(): number {
  return VENDOR_DEMO_SERVICES.reduce((sum, s) => {
    if (s.cost_annual) return sum + s.cost_annual;
    const visits = VISITS_PER_YEAR[s.service_frequency] || 1;
    return sum + (s.cost_per_visit || 0) * visits;
  }, 0);
}

/** Count of unique locations with services */
export function getDemoServiceLocationCount(): number {
  return new Set(VENDOR_DEMO_SERVICES.map(s => s.location_id)).size;
}

/** Next-due service date calculation */
export function calculateNextServiceDate(
  lastDate: string,
  frequency: string,
  intervalDays?: number,
): string {
  const intervals: Record<string, number> = {
    Monthly: 30,
    Quarterly: 90,
    'Semi-Annual': 180,
    Annual: 365,
    Custom: intervalDays || 90,
  };
  const days = intervals[frequency];
  if (!days || !lastDate) return '';
  const next = new Date(lastDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().split('T')[0];
}

/** Status pill logic for a service based on next_service_date */
export function getServiceStatus(nextDate: string): {
  label: string;
  color: 'red' | 'amber' | 'gold' | 'green' | 'gray';
} {
  if (!nextDate) return { label: 'Not scheduled', color: 'gray' };
  const days = Math.ceil(
    (new Date(nextDate).getTime() - Date.now()) / 86_400_000,
  );
  if (days < 0)
    return { label: `${Math.abs(days)}d overdue`, color: 'red' };
  if (days <= 14) return { label: `Due in ${days}d`, color: 'amber' };
  if (days <= 30) return { label: `Due in ${days}d`, color: 'gold' };
  return { label: `${days}d away`, color: 'green' };
}
