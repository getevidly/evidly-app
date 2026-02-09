interface TempHistoryEntry {
  id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  temperature_value: number;
  is_within_range: boolean;
  recorded_by_name: string;
  corrective_action: string | null;
  created_at: string;
}

// Deterministic pseudo-random for consistent demo data
const pRand = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function generateTempDemoHistory(now: Date): TempHistoryEntry[] {
  const history: TempHistoryEntry[] = [];
  const staff = ['Sarah Chen', 'Mike Johnson', 'Emma Davis', 'John Smith'];

  // Equipment definitions with realistic fluctuation ranges
  // User-specified ranges: Prep Cooler 36-40, Walk-in Cooler 35-39, Walk-in Freezer -5 to 0,
  // Hot Hold 125-145 with dips below 135, Salad Bar 34-41, Reach-in Freezer -8 to 0
  const eqDefs = [
    { id: '1', name: 'Walk-in Cooler', type: 'cooler', base: 37, spread: 2, min: 32, max: 41 },
    { id: '2', name: 'Walk-in Freezer', type: 'freezer', base: -2.5, spread: 2.5, min: -10, max: 0 },
    { id: '3', name: 'Prep Cooler', type: 'cooler', base: 38, spread: 2, min: 32, max: 41 },
    { id: '4', name: 'Hot Hold Cabinet', type: 'hot_hold', base: 140, spread: 5, min: 135, max: 165 },
    { id: '5', name: 'Salad Bar', type: 'cooler', base: 37.5, spread: 3.5, min: 32, max: 41 },
    { id: '6', name: 'Reach-in Freezer', type: 'freezer', base: -4, spread: 4, min: -10, max: 0 },
  ];

  // Readings every 3 hours: 6am, 9am, 12pm, 3pm, 6pm, 9pm
  const readingHours = [6, 9, 12, 15, 18, 21];
  let id = 1;

  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const day = new Date(now);
    day.setDate(day.getDate() - daysAgo);
    day.setSeconds(0, 0);

    const maxHour = daysAgo === 0 ? now.getHours() : 23;

    for (const hour of readingHours) {
      if (hour > maxHour) continue;

      for (const eq of eqDefs) {
        const seed = daysAgo * 1000 + hour * 100 + parseInt(eq.id) * 7;
        const minuteOffset = Math.floor(pRand(seed + 99) * 15); // 0-14 min offset

        const readingTime = new Date(day);
        readingTime.setHours(hour, minuteOffset, 0, 0);

        let temp = eq.base + (pRand(seed) - 0.5) * eq.spread * 2;

        // Hot Hold Cabinet: occasional dips below 135 (~8% of readings)
        if (eq.id === '4' && pRand(seed * 3 + 7) < 0.08) {
          temp = 125 + pRand(seed * 5) * 10; // 125-135
        }
        // Salad Bar: occasional spike above 41 (~5%)
        if (eq.id === '5' && pRand(seed * 3 + 13) < 0.05) {
          temp = 41 + pRand(seed * 5 + 3) * 3; // 41-44
        }
        // Walk-in Cooler: rare spike (~3%)
        if (eq.id === '1' && pRand(seed * 3 + 19) < 0.03) {
          temp = 41 + pRand(seed * 5 + 11) * 2; // 41-43
        }
        // Prep Cooler: occasional drift (~4%)
        if (eq.id === '3' && pRand(seed * 3 + 23) < 0.04) {
          temp = 40 + pRand(seed * 5 + 17) * 2; // 40-42
        }

        temp = Math.round(temp * 10) / 10;
        const isWithinRange = temp >= eq.min && temp <= eq.max;

        history.push({
          id: String(id++),
          equipment_id: eq.id,
          equipment_name: eq.name,
          equipment_type: eq.type,
          temperature_value: temp,
          is_within_range: isWithinRange,
          recorded_by_name: staff[Math.floor(pRand(seed * 2 + 31) * staff.length)],
          corrective_action: !isWithinRange ? 'Adjusted temperature setting and monitoring closely' : null,
          created_at: readingTime.toISOString(),
        });

        id++;
      }
    }
  }

  return history;
}

// Color map for chart lines
export const equipmentColors: Record<string, string> = {
  'Walk-in Cooler': '#1e4d6b',
  'Walk-in Freezer': '#6366f1',
  'Prep Cooler': '#2a6a8f',
  'Hot Hold Cabinet': '#dc2626',
  'Salad Bar': '#16a34a',
  'Reach-in Freezer': '#8b5cf6',
};
