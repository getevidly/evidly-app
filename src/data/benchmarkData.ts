// ─── Compliance Benchmarking Index — Static Demo Data ─────────────────────
// Simulates anonymized, aggregated data across all EvidLY customers

// ─── Types ────────────────────────────────────────────────────────────────

export type BenchmarkVertical = 'Restaurant' | 'Healthcare' | 'Senior Living' | 'K-12' | 'Hotel' | 'QSR';
export type BenchmarkSubVertical = 'Fine Dining' | 'Casual Dining' | 'Fast Casual' | 'Food Truck' | 'Catering';
export type BenchmarkSize = 'single' | '2-10' | '11-50' | '50+';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface VerticalBenchmark {
  vertical: BenchmarkVertical;
  avgScore: number;
  avgFoodSafety: number;
  avgFireSafety: number;
  peerCount: number;
}

export interface GeoBenchmark {
  level: 'state' | 'county';
  name: string;
  avgScore: number;
  peerCount: number;
}

export interface SizeBenchmark {
  size: BenchmarkSize;
  label: string;
  avgScore: number;
  peerCount: number;
}

export interface SubcategoryBenchmark {
  key: string;
  label: string;
  pillar: 'Food Safety' | 'Fire Safety';
  industryAvg: number;
  verticalAvg: number;
}

export interface MonthlyTrend {
  month: string;
  yourScore: number;
  verticalAvg: number;
  industryAvg: number;
}

export interface PercentileData {
  score: number;
  percentile: number;
  rank: number;
  totalPeers: number;
  industryPercentile: number;
  verticalPercentile: number;
  geoPercentile: number;
}

export interface BadgeQualification {
  locationId: string;
  locationCode: string;
  tier: BadgeTier | null;
  qualified: boolean;
  qualifyingSince: string | null;
  monthsQualified: number;
  nextTier: BadgeTier | null;
  progressToNext: number;
}

export interface LocationVerification {
  locationCode: string;
  businessName: string;
  city: string;
  state: string;
  badgeTier: BadgeTier | null;
  qualifyingPeriod: string;
  percentile: number;
  categoryRankings: { category: string; percentile: number }[];
}

export interface LeadLagItem {
  subcategory: string;
  yourScore: number;
  verticalAvg: number;
  delta: number;
  percentile: number;
  recommendation: string;
}

interface BenchmarkFilters {
  vertical?: BenchmarkVertical;
  size?: BenchmarkSize;
  state?: string;
  county?: string;
}

// ─── Vertical Benchmarks ──────────────────────────────────────────────────

export const VERTICAL_BENCHMARKS: VerticalBenchmark[] = [
  { vertical: 'Restaurant', avgScore: 74, avgFoodSafety: 76, avgFireSafety: 70, peerCount: 4200 },
  { vertical: 'Healthcare', avgScore: 78, avgFoodSafety: 80, avgFireSafety: 76, peerCount: 2100 },
  { vertical: 'Senior Living', avgScore: 76, avgFoodSafety: 78, avgFireSafety: 73, peerCount: 890 },
  { vertical: 'K-12', avgScore: 72, avgFoodSafety: 74, avgFireSafety: 68, peerCount: 1560 },
  { vertical: 'Hotel', avgScore: 75, avgFoodSafety: 77, avgFireSafety: 72, peerCount: 1340 },
  { vertical: 'QSR', avgScore: 71, avgFoodSafety: 73, avgFireSafety: 67, peerCount: 3800 },
];

export const SUB_VERTICAL_BENCHMARKS: Record<BenchmarkSubVertical, { avgScore: number; peerCount: number }> = {
  'Fine Dining': { avgScore: 79, peerCount: 620 },
  'Casual Dining': { avgScore: 74, peerCount: 1480 },
  'Fast Casual': { avgScore: 72, peerCount: 1100 },
  'Food Truck': { avgScore: 68, peerCount: 540 },
  'Catering': { avgScore: 76, peerCount: 460 },
};

// ─── Geographic Benchmarks ────────────────────────────────────────────────

export const GEO_BENCHMARKS: GeoBenchmark[] = [
  { level: 'state', name: 'California', avgScore: 73, peerCount: 4200 },
  { level: 'county', name: 'Fresno County', avgScore: 71, peerCount: 412 },
  { level: 'county', name: 'Merced County', avgScore: 69, peerCount: 186 },
  { level: 'county', name: 'Stanislaus County', avgScore: 70, peerCount: 203 },
];

// ─── Size Benchmarks ──────────────────────────────────────────────────────

export const SIZE_BENCHMARKS: SizeBenchmark[] = [
  { size: 'single', label: 'Single Location', avgScore: 68, peerCount: 2100 },
  { size: '2-10', label: '2-10 Locations', avgScore: 73, peerCount: 1400 },
  { size: '11-50', label: '11-50 Locations', avgScore: 77, peerCount: 580 },
  { size: '50+', label: '50+ Locations', avgScore: 81, peerCount: 120 },
];

// ─── Subcategory Benchmarks ───────────────────────────────────────────────

export const SUBCATEGORY_BENCHMARKS: SubcategoryBenchmark[] = [
  { key: 'temp_compliance', label: 'Temperature Compliance', pillar: 'Food Safety', industryAvg: 82, verticalAvg: 79 },
  { key: 'checklist_completion', label: 'Checklist Completion Rate', pillar: 'Food Safety', industryAvg: 76, verticalAvg: 74 },
  { key: 'cooling_log', label: 'Cooling Log Compliance', pillar: 'Food Safety', industryAvg: 74, verticalAvg: 71 },
  { key: 'hood_cleaning', label: 'Hood Cleaning Timeliness', pillar: 'Fire Safety', industryAvg: 71, verticalAvg: 68 },
  { key: 'fire_suppression', label: 'Fire Suppression Currency', pillar: 'Fire Safety', industryAvg: 84, verticalAvg: 82 },
  { key: 'food_handler_cert', label: 'Food Handler Cert Currency', pillar: 'Food Safety', industryAvg: 85, verticalAvg: 83 },
  { key: 'vendor_coi', label: 'Vendor COI Completeness', pillar: 'Food Safety', industryAvg: 78, verticalAvg: 75 },
  { key: 'corrective_action', label: 'Corrective Action Response Time', pillar: 'Food Safety', industryAvg: 72, verticalAvg: 70 },
];

// ─── Per-Location Subcategory Scores ──────────────────────────────────────
// These simulate the user's actual performance in each subcategory

export const LOCATION_SUBCATEGORY_SCORES: Record<string, Record<string, number>> = {
  downtown: {
    temp_compliance: 95, checklist_completion: 88, cooling_log: 90,
    hood_cleaning: 85, fire_suppression: 92, food_handler_cert: 94,
    vendor_coi: 88, corrective_action: 86,
  },
  airport: {
    temp_compliance: 72, checklist_completion: 65, cooling_log: 68,
    hood_cleaning: 55, fire_suppression: 78, food_handler_cert: 74,
    vendor_coi: 62, corrective_action: 60,
  },
  university: {
    temp_compliance: 58, checklist_completion: 48, cooling_log: 52,
    hood_cleaning: 40, fire_suppression: 65, food_handler_cert: 55,
    vendor_coi: 42, corrective_action: 45,
  },
};

// ─── Monthly Trends (12 months) ───────────────────────────────────────────

const MONTHS = ['Mar \'25','Apr \'25','May \'25','Jun \'25','Jul \'25','Aug \'25','Sep \'25','Oct \'25','Nov \'25','Dec \'25','Jan \'26','Feb \'26'];

export const MONTHLY_TRENDS: Record<string, MonthlyTrend[]> = {
  downtown: MONTHS.map((month, i) => ({
    month,
    yourScore: [85, 86, 87, 88, 88, 89, 90, 89, 91, 90, 91, 92][i],
    verticalAvg: [72, 72, 73, 73, 73, 74, 74, 74, 74, 74, 74, 74][i],
    industryAvg: [71, 71, 72, 72, 72, 72, 73, 73, 73, 73, 73, 73][i],
  })),
  airport: MONTHS.map((month, i) => ({
    month,
    yourScore: [64, 65, 66, 67, 66, 68, 69, 68, 69, 71, 70, 70][i],
    verticalAvg: [72, 72, 73, 73, 73, 74, 74, 74, 74, 74, 74, 74][i],
    industryAvg: [71, 71, 72, 72, 72, 72, 73, 73, 73, 73, 73, 73][i],
  })),
  university: MONTHS.map((month, i) => ({
    month,
    yourScore: [42, 44, 46, 48, 47, 49, 51, 50, 52, 53, 53, 55][i],
    verticalAvg: [72, 72, 73, 73, 73, 74, 74, 74, 74, 74, 74, 74][i],
    industryAvg: [71, 71, 72, 72, 72, 72, 73, 73, 73, 73, 73, 73][i],
  })),
};

// ─── Percentile Data ──────────────────────────────────────────────────────

export const PERCENTILE_DATA: Record<string, PercentileData> = {
  downtown: { score: 92, percentile: 89, rank: 47, totalPeers: 412, industryPercentile: 91, verticalPercentile: 89, geoPercentile: 93 },
  airport: { score: 70, percentile: 52, rank: 200, totalPeers: 412, industryPercentile: 48, verticalPercentile: 52, geoPercentile: 55 },
  university: { score: 55, percentile: 18, rank: 339, totalPeers: 412, industryPercentile: 15, verticalPercentile: 18, geoPercentile: 21 },
  all: { score: 72, percentile: 58, rank: 174, totalPeers: 412, industryPercentile: 55, verticalPercentile: 58, geoPercentile: 61 },
};

// ─── Badge Qualifications ─────────────────────────────────────────────────

export const BADGE_QUALIFICATIONS: Record<string, BadgeQualification> = {
  downtown: {
    locationId: 'downtown',
    locationCode: 'downtown-kitchen',
    tier: 'gold',
    qualified: true,
    qualifyingSince: '2025-11-01',
    monthsQualified: 4,
    nextTier: 'platinum',
    progressToNext: 67,
  },
  airport: {
    locationId: 'airport',
    locationCode: 'airport-cafe',
    tier: null,
    qualified: false,
    qualifyingSince: null,
    monthsQualified: 0,
    nextTier: 'bronze',
    progressToNext: 88,
  },
  university: {
    locationId: 'university',
    locationCode: 'university-dining',
    tier: null,
    qualified: false,
    qualifyingSince: null,
    monthsQualified: 0,
    nextTier: 'bronze',
    progressToNext: 35,
  },
};

// ─── Verification Data ────────────────────────────────────────────────────

export const VERIFICATION_DATA: Record<string, LocationVerification> = {
  'downtown-kitchen': {
    locationCode: 'downtown-kitchen',
    businessName: 'Downtown Kitchen',
    city: 'Fresno',
    state: 'CA',
    badgeTier: 'gold',
    qualifyingPeriod: 'Nov 2025 - Feb 2026',
    percentile: 89,
    categoryRankings: [
      { category: 'Food Safety', percentile: 91 },
      { category: 'Fire Safety', percentile: 85 },
    ],
  },
  'airport-cafe': {
    locationCode: 'airport-cafe',
    businessName: 'Airport Cafe',
    city: 'Merced',
    state: 'CA',
    badgeTier: null,
    qualifyingPeriod: '',
    percentile: 52,
    categoryRankings: [
      { category: 'Food Safety', percentile: 55 },
      { category: 'Fire Safety', percentile: 44 },
    ],
  },
  'university-dining': {
    locationCode: 'university-dining',
    businessName: 'University Dining',
    city: 'Modesto',
    state: 'CA',
    badgeTier: null,
    qualifyingPeriod: '',
    percentile: 18,
    categoryRankings: [
      { category: 'Food Safety', percentile: 22 },
      { category: 'Fire Safety', percentile: 15 },
    ],
  },
};

// ─── Lead/Lag Data ────────────────────────────────────────────────────────

export const LEAD_LAG_DATA: Record<string, { leads: LeadLagItem[]; lags: LeadLagItem[] }> = {
  downtown: {
    leads: [
      { subcategory: 'Temperature Compliance', yourScore: 95, verticalAvg: 79, delta: 16, percentile: 96, recommendation: '' },
      { subcategory: 'Food Handler Cert Currency', yourScore: 94, verticalAvg: 83, delta: 11, percentile: 93, recommendation: '' },
      { subcategory: 'Fire Suppression Currency', yourScore: 92, verticalAvg: 82, delta: 10, percentile: 90, recommendation: '' },
    ],
    lags: [
      { subcategory: 'Hood Cleaning Timeliness', yourScore: 85, verticalAvg: 68, delta: 17, percentile: 82, recommendation: 'Already above average, but scheduling bi-monthly deep cleans could push into the 90th percentile.' },
      { subcategory: 'Corrective Action Response Time', yourScore: 86, verticalAvg: 70, delta: 16, percentile: 84, recommendation: 'Strong performance. Consider documenting your process as a best practice template.' },
      { subcategory: 'Checklist Completion Rate', yourScore: 88, verticalAvg: 74, delta: 14, percentile: 86, recommendation: 'Top performer. Maintain consistency across all shifts.' },
    ],
  },
  airport: {
    leads: [
      { subcategory: 'Fire Suppression Currency', yourScore: 78, verticalAvg: 82, delta: -4, percentile: 45, recommendation: '' },
      { subcategory: 'Food Handler Cert Currency', yourScore: 74, verticalAvg: 83, delta: -9, percentile: 38, recommendation: '' },
      { subcategory: 'Temperature Compliance', yourScore: 72, verticalAvg: 79, delta: -7, percentile: 42, recommendation: '' },
    ],
    lags: [
      { subcategory: 'Hood Cleaning Timeliness', yourScore: 55, verticalAvg: 68, delta: -13, percentile: 25, recommendation: 'Schedule vendor service immediately. Hood cleaning is 95 days overdue — exceeding the 90-day cycle.' },
      { subcategory: 'Corrective Action Response Time', yourScore: 60, verticalAvg: 70, delta: -10, percentile: 30, recommendation: 'Assign a dedicated corrective action owner per shift to reduce response lag.' },
      { subcategory: 'Vendor COI Completeness', yourScore: 62, verticalAvg: 75, delta: -13, percentile: 28, recommendation: 'Request updated certificates of insurance from 3 vendors with expired COIs.' },
    ],
  },
  university: {
    leads: [
      { subcategory: 'Fire Suppression Currency', yourScore: 65, verticalAvg: 82, delta: -17, percentile: 20, recommendation: '' },
      { subcategory: 'Temperature Compliance', yourScore: 58, verticalAvg: 79, delta: -21, percentile: 14, recommendation: '' },
      { subcategory: 'Food Handler Cert Currency', yourScore: 55, verticalAvg: 83, delta: -28, percentile: 10, recommendation: '' },
    ],
    lags: [
      { subcategory: 'Hood Cleaning Timeliness', yourScore: 40, verticalAvg: 68, delta: -28, percentile: 5, recommendation: 'Critical: Hood cleaning is severely overdue. Schedule emergency service and set up automated reminders.' },
      { subcategory: 'Vendor COI Completeness', yourScore: 42, verticalAvg: 75, delta: -33, percentile: 6, recommendation: 'Multiple vendor documents are expired or missing. Prioritize collecting updated COIs this week.' },
      { subcategory: 'Corrective Action Response Time', yourScore: 45, verticalAvg: 70, delta: -25, percentile: 8, recommendation: 'Establish a daily corrective action review process. Assign ownership for each open item.' },
    ],
  },
  all: {
    leads: [
      { subcategory: 'Temperature Compliance', yourScore: 75, verticalAvg: 79, delta: -4, percentile: 51, recommendation: '' },
      { subcategory: 'Fire Suppression Currency', yourScore: 78, verticalAvg: 82, delta: -4, percentile: 48, recommendation: '' },
      { subcategory: 'Food Handler Cert Currency', yourScore: 74, verticalAvg: 83, delta: -9, percentile: 40, recommendation: '' },
    ],
    lags: [
      { subcategory: 'Hood Cleaning Timeliness', yourScore: 60, verticalAvg: 68, delta: -8, percentile: 37, recommendation: 'Two locations have overdue hood cleaning. Coordinate vendor scheduling across all sites.' },
      { subcategory: 'Vendor COI Completeness', yourScore: 64, verticalAvg: 75, delta: -11, percentile: 33, recommendation: 'Centralize vendor document collection. Use the vendor portal to automate COI requests.' },
      { subcategory: 'Corrective Action Response Time', yourScore: 64, verticalAvg: 70, delta: -6, percentile: 38, recommendation: 'Standardize corrective action procedures across all locations for consistency.' },
    ],
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────

export function getPercentile(locationId: string): PercentileData {
  return PERCENTILE_DATA[locationId] || PERCENTILE_DATA['all'];
}

export function getBenchmarkComparison(locationId: string) {
  const percentile = getPercentile(locationId);
  const vertical = VERTICAL_BENCHMARKS.find(v => v.vertical === 'Restaurant')!;
  const geo = GEO_BENCHMARKS.find(g => g.level === 'county' && g.name === 'Fresno County') || GEO_BENCHMARKS[0];
  const leadLag = LEAD_LAG_DATA[locationId] || LEAD_LAG_DATA['all'];
  const badge = BADGE_QUALIFICATIONS[locationId] || null;
  const trends = MONTHLY_TRENDS[locationId] || MONTHLY_TRENDS['downtown'];

  const lastQuarterScore = trends.length >= 4 ? trends[trends.length - 4].yourScore : trends[0].yourScore;
  const currentScore = trends[trends.length - 1].yourScore;
  const quarterlyChange = currentScore - lastQuarterScore;

  return {
    percentile,
    vertical,
    geo,
    leadLag,
    badge,
    trends,
    quarterlyChange,
    industryAvg: 73,
  };
}

export function getFilteredBenchmark(filters: BenchmarkFilters): { avgScore: number; peerCount: number; label: string } {
  let avgScore = 73;
  let peerCount = 4200;
  let label = 'All EvidLY Customers';

  if (filters.vertical) {
    const v = VERTICAL_BENCHMARKS.find(b => b.vertical === filters.vertical);
    if (v) { avgScore = v.avgScore; peerCount = v.peerCount; label = filters.vertical; }
  }
  if (filters.county) {
    const g = GEO_BENCHMARKS.find(b => b.name === filters.county);
    if (g) { avgScore = Math.round((avgScore + g.avgScore) / 2); peerCount = Math.min(peerCount, g.peerCount); label += ` in ${g.name}`; }
  } else if (filters.state) {
    const g = GEO_BENCHMARKS.find(b => b.level === 'state' && b.name === filters.state);
    if (g) { avgScore = Math.round((avgScore + g.avgScore) / 2); peerCount = Math.min(peerCount, g.peerCount); label += ` in ${g.name}`; }
  }
  if (filters.size) {
    const s = SIZE_BENCHMARKS.find(b => b.size === filters.size);
    if (s) { avgScore = Math.round((avgScore + s.avgScore) / 2); peerCount = Math.min(peerCount, s.peerCount); label += ` (${s.label})`; }
  }

  return { avgScore, peerCount, label };
}
