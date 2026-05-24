import { useMemo } from 'react';
import { subDays } from 'date-fns';
import type { TempCheckCompletion, TemperatureEquipment } from '../../pages/TempLogs';

export interface AnalyticsChartData {
  methodData: { name: string; value: number; color: string }[];
  methodSingleMethod: string | null;
  weeklyData: { week: string; rate: number; count: number }[];
  equipmentData: { name: string; rate: number; total: number }[];
  equipmentInsufficient: boolean;
  timeData: { time: string; count: number }[];
}

export function useTemperatureAnalyticsCharts(
  history: TempCheckCompletion[],
  _equipment: TemperatureEquipment[],
  windowDays: number,
): AnalyticsChartData {
  return useMemo(() => {
    const now = new Date();
    const windowStart = windowDays === 0
      ? new Date(0)
      : subDays(now, windowDays);

    const filtered = history.filter(h => new Date(h.created_at) >= windowStart);

    // Method breakdown
    const manualCount = filtered.filter(h => (h.input_method || 'manual') === 'manual').length;
    const qrCount = filtered.filter(h => h.input_method === 'qr_scan').length;
    const iotCount = filtered.filter(h => h.input_method === 'iot_sensor').length;

    const rawMethodData = [
      { name: 'Manual', value: manualCount, color: '#6b7280' },
      { name: 'QR Scan', value: qrCount, color: '#1E2D4D' },
      { name: 'IoT Sensor', value: iotCount, color: '#059669' },
    ].filter(d => d.value > 0);

    let methodSingleMethod: string | null = null;
    if (rawMethodData.length === 1) {
      methodSingleMethod = rawMethodData[0].name;
    }

    // Weekly compliance trend
    const weeksToShow = Math.min(Math.ceil(windowDays / 7), 12) || 4;
    const weeklyData: { week: string; rate: number; count: number }[] = [];
    const weekFmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    for (let w = weeksToShow - 1; w >= 0; w--) {
      const weekStart = subDays(now, (w + 1) * 7);
      const weekEnd = subDays(now, w * 7);
      const weekLogs = filtered.filter(h => {
        const d = new Date(h.created_at);
        return d >= weekStart && d < weekEnd;
      });
      const weekPass = weekLogs.filter(h => h.is_within_range).length;
      const labelEnd = new Date(weekEnd);
      labelEnd.setDate(labelEnd.getDate() - 1);
      weeklyData.push({
        week: w === 0 ? 'This week' : `${weekFmt(weekStart)}\u2013${weekFmt(labelEnd)}`,
        rate: weekLogs.length > 0 ? Math.round((weekPass / weekLogs.length) * 100) : 0,
        count: weekLogs.length,
      });
    }

    // Equipment compliance
    const eqNames = [...new Set(filtered.map(h => h.equipment_name))];
    const equipmentData = eqNames.map(name => {
      const logs = filtered.filter(h => h.equipment_name === name);
      const pass = logs.filter(h => h.is_within_range).length;
      return {
        name: name.length > 20 ? name.slice(0, 20) + '\u2026' : name,
        rate: logs.length > 0 ? Math.round((pass / logs.length) * 100) : 0,
        total: logs.length,
      };
    }).sort((a, b) => a.rate - b.rate);

    const equipmentInsufficient = eqNames.length < 2;

    // Time of day distribution (2-hour buckets)
    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h += 2) {
      const label = `${String(h).padStart(2, '0')}:00`;
      buckets[label] = 0;
    }
    for (const h of filtered) {
      const hour = new Date(h.created_at).getHours();
      const bucketHour = Math.floor(hour / 2) * 2;
      const label = `${String(bucketHour).padStart(2, '0')}:00`;
      buckets[label] = (buckets[label] || 0) + 1;
    }
    const timeData = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time, count }));

    return {
      methodData: rawMethodData,
      methodSingleMethod,
      weeklyData,
      equipmentData,
      equipmentInsufficient,
      timeData,
    };
  }, [history, windowDays]);
}
