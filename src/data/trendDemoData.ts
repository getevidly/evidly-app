// ============================================================
// 90-Day Category-Level Trend Demo Data — GAP-03
// ============================================================
// Generates per-location daily trajectories with category-level
// granularity for trend analytics charts and analysis.
//
// Stories:
//   Downtown: Steady excellence, minor improvements
//   Airport: Clear improvement arc, management intervention ~day 40
//   University: Declining, temp compliance + incidents degrading
// ============================================================

// ── Types ────────────────────────────────────────────────────

export interface CategoryTrendDataPoint {
  date: string;                 // ISO "YYYY-MM-DD"
  dateDisplay: string;          // "Jan 15" for chart labels
  foodSafety: number;
  facilitySafety: number;
  // Category-level
  tempCompliance: number;       // 0-100
  checklistCompletion: number;  // 0-100
  haccpMonitoring: number;      // 0-100
  incidentResolution: number;   // hours (lower = better)
  documentCurrency: number;     // 0-100
  facilitySafetyOps: number;    // 0-100
}

// ── Deterministic Series Generator ───────────────────────────

/**
 * Generates a deterministic numeric series from start to end
 * over N days with controlled jitter and optional events.
 *
 * Uses a simple seeded PRNG so output is repeatable.
 */
function generateSeries(
  start: number,
  end: number,
  days: number,
  jitter: number,
  seed: number,
  events?: { day: number; delta: number }[],
  clampMin = 0,
  clampMax = 100,
): number[] {
  const result: number[] = [];
  let rng = seed;

  for (let i = 0; i < days; i++) {
    // Linear interpolation from start to end
    const t = days > 1 ? i / (days - 1) : 0;
    let value = start + (end - start) * t;

    // Apply events (step changes)
    if (events) {
      for (const e of events) {
        if (i >= e.day) {
          value += e.delta;
        }
      }
    }

    // Seeded jitter (deterministic pseudo-random)
    rng = (rng * 16807 + 0) % 2147483647;
    const noise = ((rng / 2147483647) - 0.5) * 2 * jitter;
    value += noise;

    result.push(Math.round(Math.max(clampMin, Math.min(clampMax, value))));
  }

  return result;
}

/**
 * Generate an incident resolution hours series (lower = better).
 * Clamped to 0.5 minimum.
 */
function generateHoursSeries(
  start: number,
  end: number,
  days: number,
  jitter: number,
  seed: number,
  events?: { day: number; delta: number }[],
): number[] {
  const result: number[] = [];
  let rng = seed;

  for (let i = 0; i < days; i++) {
    const t = days > 1 ? i / (days - 1) : 0;
    let value = start + (end - start) * t;

    if (events) {
      for (const e of events) {
        if (i >= e.day) value += e.delta;
      }
    }

    rng = (rng * 16807 + 0) % 2147483647;
    const noise = ((rng / 2147483647) - 0.5) * 2 * jitter;
    value += noise;

    result.push(Math.round(Math.max(0.5, value) * 10) / 10);
  }

  return result;
}

// ── Date Helpers ─────────────────────────────────────────────

function getDateNDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Per-Location Series Definitions ──────────────────────────

const DAYS = 90;

interface LocationConfig {
  // Pillar targets (start → end over 90 days)
  foodStart: number; foodEnd: number;
  facilityStart: number; facilityEnd: number;
  // Category targets
  tempStart: number; tempEnd: number;
  checklistStart: number; checklistEnd: number;
  haccpStart: number; haccpEnd: number;
  incidentStart: number; incidentEnd: number; // hours (lower = better)
  docStart: number; docEnd: number;
  facOpsStart: number; facOpsEnd: number;
  // Jitter
  jitter: number;
  // Events
  events?: { day: number; delta: number }[];
  seeds: number[];
}

const DOWNTOWN_CONFIG: LocationConfig = {
  foodStart: 91, foodEnd: 96,
  facilityStart: 88, facilityEnd: 92,
  tempStart: 94, tempEnd: 97,
  checklistStart: 92, checklistEnd: 96,
  haccpStart: 95, haccpEnd: 98,
  incidentStart: 2.0, incidentEnd: 1.5,
  docStart: 91, docEnd: 94,
  facOpsStart: 85, facOpsEnd: 88,
  jitter: 1,
  seeds: [101, 102, 103, 104, 105, 106, 107, 108],
};

const AIRPORT_CONFIG: LocationConfig = {
  foodStart: 74, foodEnd: 84,
  facilityStart: 70, facilityEnd: 79,
  tempStart: 76, tempEnd: 84,
  checklistStart: 72, checklistEnd: 86,
  haccpStart: 82, haccpEnd: 92,
  incidentStart: 8, incidentEnd: 4,
  docStart: 72, docEnd: 80,
  facOpsStart: 68, facOpsEnd: 75,
  jitter: 1.5,
  events: [{ day: 40, delta: 3 }],  // management intervention
  seeds: [201, 202, 203, 204, 205, 206, 207, 208],
};

const UNIVERSITY_CONFIG: LocationConfig = {
  foodStart: 82, foodEnd: 72,
  facilityStart: 74, facilityEnd: 64,
  tempStart: 82, tempEnd: 65,
  checklistStart: 80, checklistEnd: 72,
  haccpStart: 88, haccpEnd: 85,
  incidentStart: 6, incidentEnd: 12,
  docStart: 78, docEnd: 69,
  facOpsStart: 72, facOpsEnd: 55,
  jitter: 1.5,
  seeds: [301, 302, 303, 304, 305, 306, 307, 308],
};

// ── Build Trend Data ─────────────────────────────────────────

function buildLocationTrend(config: LocationConfig): CategoryTrendDataPoint[] {
  const food = generateSeries(config.foodStart, config.foodEnd, DAYS, config.jitter, config.seeds[0], config.events);
  const facility = generateSeries(config.facilityStart, config.facilityEnd, DAYS, config.jitter, config.seeds[1], config.events);
  const temp = generateSeries(config.tempStart, config.tempEnd, DAYS, config.jitter, config.seeds[2], config.events);
  const checklist = generateSeries(config.checklistStart, config.checklistEnd, DAYS, config.jitter, config.seeds[3], config.events);
  const haccp = generateSeries(config.haccpStart, config.haccpEnd, DAYS, config.jitter, config.seeds[4], config.events);
  const incidents = generateHoursSeries(config.incidentStart, config.incidentEnd, DAYS, config.jitter * 0.5, config.seeds[5], config.events);
  const docs = generateSeries(config.docStart, config.docEnd, DAYS, config.jitter, config.seeds[6], config.events);
  const facOps = generateSeries(config.facOpsStart, config.facOpsEnd, DAYS, config.jitter, config.seeds[7], config.events);

  const points: CategoryTrendDataPoint[] = [];

  for (let i = 0; i < DAYS; i++) {
    const d = getDateNDaysAgo(DAYS - 1 - i);
    points.push({
      date: formatISO(d),
      dateDisplay: formatDisplay(d),
      foodSafety: food[i],
      facilitySafety: facility[i],
      tempCompliance: temp[i],
      checklistCompletion: checklist[i],
      haccpMonitoring: haccp[i],
      incidentResolution: incidents[i],
      documentCurrency: docs[i],
      facilitySafetyOps: facOps[i],
    });
  }

  return points;
}

// ── Exported Data ────────────────────────────────────────────

export const CATEGORY_LOCATION_TRENDS: Record<string, CategoryTrendDataPoint[]> = {
  downtown: buildLocationTrend(DOWNTOWN_CONFIG),
  airport: buildLocationTrend(AIRPORT_CONFIG),
  university: buildLocationTrend(UNIVERSITY_CONFIG),
};

/**
 * Org-level category trends: average of all locations per day.
 */
export const CATEGORY_ORG_TRENDS: CategoryTrendDataPoint[] = (() => {
  const locs = Object.values(CATEGORY_LOCATION_TRENDS);
  const days = locs[0].length;
  const result: CategoryTrendDataPoint[] = [];

  for (let i = 0; i < days; i++) {
    const pts = locs.map((l) => l[i]);
    const avg = (key: keyof CategoryTrendDataPoint) =>
      Math.round(pts.reduce((s, p) => s + (p[key] as number), 0) / pts.length);
    const avgHours = (key: keyof CategoryTrendDataPoint) =>
      Math.round((pts.reduce((s, p) => s + (p[key] as number), 0) / pts.length) * 10) / 10;

    result.push({
      date: pts[0].date,
      dateDisplay: pts[0].dateDisplay,
      foodSafety: avg('foodSafety'),
      facilitySafety: avg('facilitySafety'),
      tempCompliance: avg('tempCompliance'),
      checklistCompletion: avg('checklistCompletion'),
      haccpMonitoring: avg('haccpMonitoring'),
      incidentResolution: avgHours('incidentResolution'),
      documentCurrency: avg('documentCurrency'),
      facilitySafetyOps: avg('facilitySafetyOps'),
    });
  }

  return result;
})();

/**
 * Get category scores from N days ago per location.
 */
export function getCategoryScoresNDaysAgo(
  n: number,
): Record<string, { foodSafety: number; facilitySafety: number }> {
  const result: Record<string, { foodSafety: number; facilitySafety: number }> = {};
  for (const [locId, trend] of Object.entries(CATEGORY_LOCATION_TRENDS)) {
    const idx = trend.length - 1 - n;
    const pt = idx >= 0 ? trend[idx] : trend[0];
    result[locId] = { foodSafety: pt.foodSafety, facilitySafety: pt.facilitySafety };
  }
  return result;
}
