export interface TempHistoryEntry {
  id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  temperature_value: number;
  is_within_range: boolean;
  recorded_by_name: string;
  corrective_action: string | null;
  created_at: string;
  input_method: 'manual' | 'qr_scan' | 'iot_sensor';
  shift: 'morning' | 'afternoon' | 'evening';
  ccp_number: string | null;
}

// Deterministic pseudo-random for consistent demo data
const pRand = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function generateTempDemoHistory(now: Date): TempHistoryEntry[] {
  const history: TempHistoryEntry[] = [];
  const staff = ['Sarah Chen', 'Mike Johnson', 'Emma Davis', 'John Smith'];

  // 8 equipment items matching the demo equipment list
  const eqDefs = [
    { id: '1', name: 'Walk-in Cooler #1', type: 'cooler', base: 36.5, spread: 1.5, min: 35, max: 38 },
    { id: '2', name: 'Walk-in Cooler #2', type: 'cooler', base: 36.5, spread: 1.5, min: 35, max: 38 },
    { id: '3', name: 'Walk-in Freezer', type: 'freezer', base: -5, spread: 5, min: -10, max: 0 },
    { id: '4', name: 'Prep Table Cooler', type: 'cooler', base: 36.5, spread: 3.5, min: 33, max: 40 },
    { id: '5', name: 'Hot Holding Unit', type: 'hot_hold', base: 150, spread: 15, min: 135, max: 165 },
    { id: '6', name: 'Salad Bar', type: 'cooler', base: 37, spread: 4, min: 33, max: 41 },
    { id: '7', name: 'Ice Machine', type: 'freezer', base: 30, spread: 2, min: 28, max: 32 },
    { id: '8', name: 'Blast Chiller', type: 'cooler', base: 35.5, spread: 2.5, min: 33, max: 38 },
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

        // Walk-in Cooler #1: rare spike above 38 (~3%)
        if (eq.id === '1' && pRand(seed * 3 + 19) < 0.03) {
          temp = 38 + pRand(seed * 5 + 11) * 2; // 38-40
        }
        // Walk-in Cooler #2: rare spike above 38 (~3%)
        if (eq.id === '2' && pRand(seed * 3 + 29) < 0.03) {
          temp = 38 + pRand(seed * 5 + 13) * 2; // 38-40
        }
        // Prep Table Cooler: occasional drift above 40 (~4%)
        if (eq.id === '4' && pRand(seed * 3 + 23) < 0.04) {
          temp = 40 + pRand(seed * 5 + 17) * 2; // 40-42
        }
        // Hot Holding Unit: occasional dips below 135 (~8%)
        if (eq.id === '5' && pRand(seed * 3 + 7) < 0.08) {
          temp = 125 + pRand(seed * 5) * 10; // 125-135
        }
        // Salad Bar: occasional spike above 41 (~5%)
        if (eq.id === '6' && pRand(seed * 3 + 13) < 0.05) {
          temp = 41 + pRand(seed * 5 + 3) * 3; // 41-44
        }
        // Ice Machine: occasional spike above 32 (~4%)
        if (eq.id === '7' && pRand(seed * 3 + 37) < 0.04) {
          temp = 32 + pRand(seed * 5 + 19) * 2; // 32-34
        }
        // Blast Chiller: occasional drift above 38 (~3%)
        if (eq.id === '8' && pRand(seed * 3 + 41) < 0.03) {
          temp = 38 + pRand(seed * 5 + 23) * 2; // 38-40
        }

        temp = Math.round(temp * 10) / 10;
        const isWithinRange = temp >= eq.min && temp <= eq.max;

        // Assign input method: ~10% iot_sensor (coolers/freezers), ~8% qr_scan, rest manual
        const methodRand = pRand(seed * 4 + 53);
        const inputMethod: 'manual' | 'qr_scan' | 'iot_sensor' =
          (eq.type === 'cooler' || eq.type === 'freezer') && methodRand < 0.10 ? 'iot_sensor'
          : methodRand < 0.18 ? 'qr_scan'
          : 'manual';

        // Shift from reading hour
        const shift: 'morning' | 'afternoon' | 'evening' =
          hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

        // CCP mapping from equipment type
        const ccpNumber: string | null =
          eq.type === 'cooler' || eq.type === 'freezer' ? 'CCP-01'
          : eq.type === 'hot_hold' ? 'CCP-02'
          : null;

        history.push({
          id: String(id++),
          equipment_id: eq.id,
          equipment_name: eq.name,
          equipment_type: eq.type,
          temperature_value: temp,
          is_within_range: isWithinRange,
          recorded_by_name: inputMethod === 'iot_sensor' ? 'IoT Sensor' : staff[Math.floor(pRand(seed * 2 + 31) * staff.length)],
          corrective_action: !isWithinRange ? 'Adjusted temperature setting and monitoring closely' : null,
          created_at: readingTime.toISOString(),
          input_method: inputMethod,
          shift,
          ccp_number: ccpNumber,
        });

        id++;
      }
    }
  }

  return history;
}

// Color map for chart lines
export const equipmentColors: Record<string, string> = {
  'Walk-in Cooler #1': '#1e4d6b',
  'Walk-in Cooler #2': '#2a6a8f',
  'Walk-in Freezer': '#6366f1',
  'Prep Table Cooler': '#059669',
  'Hot Holding Unit': '#dc2626',
  'Salad Bar': '#16a34a',
  'Ice Machine': '#0891b2',
  'Blast Chiller': '#8b5cf6',
};
