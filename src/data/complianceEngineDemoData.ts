// ============================================================
// Compliance Engine — 30-Day Demo Trajectory Data
// ============================================================
// Per-location daily compliance score trajectories for trend
// charts. Tells the story: Downtown steady, Airport improving,
// University declining.
// ============================================================

export interface TrendDataPoint {
  date: string;
  overall: number;
  foodSafety: number;
  facilitySafety: number;
}

export interface LocationTrendData {
  locationId: string;
  trend: TrendDataPoint[];
}

// ── Per-Location 30-Day Trajectories ─────────────────────────

const DOWNTOWN_FOOD =     [93,93,93,94,94,94,94,95,95,95,95,95,95,95,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96];
const DOWNTOWN_FACILITY = [89,89,89,90,90,90,90,90,91,91,91,91,91,91,91,92,92,92,92,92,92,92,92,92,92,92,92,92,92,92];

const AIRPORT_FOOD =      [80,80,81,81,81,82,82,82,82,82,83,83,83,83,83,83,83,84,84,84,84,84,84,84,84,84,84,84,84,84];
const AIRPORT_FACILITY =  [74,74,74,75,75,75,76,76,76,76,77,77,77,77,77,78,78,78,78,78,78,79,79,79,79,79,79,79,79,79];

const UNIVERSITY_FOOD =     [80,80,79,79,78,78,78,77,77,77,76,76,76,75,75,75,75,74,74,74,74,73,73,73,72,72,72,72,72,72];
const UNIVERSITY_FACILITY = [72,72,71,71,70,70,70,69,69,68,68,68,67,67,67,66,66,66,65,65,65,65,64,64,64,64,64,64,64,64];

function buildTrend(food: number[], facility: number[]): TrendDataPoint[] {
  return food.map((f, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const fr = facility[i];
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      overall: Math.round((f + fr) / 2),
      foodSafety: f,
      facilitySafety: fr,
    };
  });
}

// ── Exported Data ────────────────────────────────────────────

export const LOCATION_TRENDS: Record<string, TrendDataPoint[]> = {
  downtown: buildTrend(DOWNTOWN_FOOD, DOWNTOWN_FACILITY),
  airport: buildTrend(AIRPORT_FOOD, AIRPORT_FACILITY),
  university: buildTrend(UNIVERSITY_FOOD, UNIVERSITY_FACILITY),
};

/**
 * Org-level trend data: weighted average of all locations per day.
 * Replaces the existing DEMO_TREND_DATA.
 */
export const ENGINE_TREND_DATA: TrendDataPoint[] = (() => {
  const days = DOWNTOWN_FOOD.length;
  const result: TrendDataPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const food = Math.round((DOWNTOWN_FOOD[i] + AIRPORT_FOOD[i] + UNIVERSITY_FOOD[i]) / 3);
    const facility = Math.round((DOWNTOWN_FACILITY[i] + AIRPORT_FACILITY[i] + UNIVERSITY_FACILITY[i]) / 3);
    result.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      overall: Math.round((food + facility) / 2),
      foodSafety: food,
      facilitySafety: facility,
    });
  }
  return result;
})();

/**
 * Get 30-day-ago scores per location (day 0 of the trajectory).
 */
export function getScoresThirtyDaysAgo(): Record<string, { foodSafety: number; facilitySafety: number }> {
  return {
    downtown: { foodSafety: DOWNTOWN_FOOD[0], facilitySafety: DOWNTOWN_FACILITY[0] },
    airport: { foodSafety: AIRPORT_FOOD[0], facilitySafety: AIRPORT_FACILITY[0] },
    university: { foodSafety: UNIVERSITY_FOOD[0], facilitySafety: UNIVERSITY_FACILITY[0] },
  };
}
