import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Significance Thresholds ────────────────────────────────────
const MIN_READINGS = 10;
const MIN_FAILURES = 3;
const COMPLIANCE_CHANGE_THRESHOLD = 5; // percentage points
const DRIFT_THRESHOLD_F = 1.5; // °F
const FAILURE_RATE_RATIO_THRESHOLD = 2.0;
const HIGH_FAILURE_RATE_PCT = 10;
const CLEAN_FAILURE_RATE_PCT = 2;
const CONFIDENCE_BORDERLINE_MAX = 65;
const SENSOR_PROBE_MATCH_WINDOW_MS = 10 * 60_000; // 10 minutes
const SENSOR_PROBE_DISAGREE_THRESHOLD_F = 2.0; // °F
const SENSOR_PROBE_AGREE_THRESHOLD_F = 1.0; // °F
const SENSOR_PROBE_MIN_PAIRS_REDUCE = 10;
const SENSOR_PROBE_MIN_PAIRS_PROVE = 20;
const HOT_HOLDING_OVERDUE_MINUTES = 240; // FDA Food Code 3-501.16
const EQUIPMENT_CHECK_OVERDUE_MINUTES = 480;
const MIN_GAPS_FOR_PATTERN = 4;
const GAP_CONCENTRATION_THRESHOLD = 0.5; // 50%

// ── Types ──────────────────────────────────────────────────────
interface Reading {
  id: string;
  equipment_id: string;
  temperature: number;
  temp_pass: boolean;
  reading_time: string;
  input_method: string;
  shift: string | null;
  log_type: string | null;
}

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  min_temp: number;
  max_temp: number;
}

interface TemperaturePattern {
  detector: string;
  prp: "predict" | "reduce" | "prove";
  title: string;
  evidence_summary: string;
  suggested_action: string;
  confidence_pct: number;
  equipment_name?: string;
  filter_for_history?: Record<string, string>;
}

// ── Tier Determination ─────────────────────────────────────────
function determineTier(readings: Reading[]): number {
  if (readings.length < 20) return 0;
  if (readings.length < 50) return 1;
  if (readings.length < 100) return 2;
  const first = new Date(readings[0].reading_time);
  const last = new Date(readings[readings.length - 1].reading_time);
  const spanDays = (last.getTime() - first.getTime()) / 86_400_000;
  if (spanDays >= 28) return 3;
  return 2;
}

// ── Detector 1: Compliance Trend ───────────────────────────────
function detectComplianceTrend(
  readings: Reading[],
  windowDays: number,
): TemperaturePattern[] {
  if (readings.length < MIN_READINGS) return [];

  const mid = Math.floor(readings.length / 2);
  const firstHalf = readings.slice(0, mid);
  const secondHalf = readings.slice(mid);

  const rate1 =
    (firstHalf.filter((r) => r.temp_pass).length / firstHalf.length) * 100;
  const rate2 =
    (secondHalf.filter((r) => r.temp_pass).length / secondHalf.length) * 100;
  const change = rate2 - rate1;

  if (Math.abs(change) < COMPLIANCE_CHANGE_THRESHOLD) return [];

  const declining = change < 0;
  const confidence = Math.min(
    95,
    Math.round(50 + Math.abs(change) * 1.5 + readings.length * 0.1),
  );

  return [
    {
      detector: "compliance_trend",
      prp: declining ? "predict" : "prove",
      title: declining
        ? `Compliance rate declining by ${Math.abs(Math.round(change))} points`
        : `Compliance rate improving by ${Math.round(change)} points`,
      evidence_summary: `First half: ${Math.round(rate1)}% compliance (${firstHalf.length} readings). Second half: ${Math.round(rate2)}% compliance (${secondHalf.length} readings). Change: ${change > 0 ? "+" : ""}${Math.round(change)} percentage points over ${windowDays}-day window.`,
      suggested_action: declining
        ? "Review recent readings for common failure causes. Check if a specific shift or equipment unit is driving the decline."
        : "Continue current practices. Document what changed to sustain this improvement.",
      confidence_pct: confidence,
      filter_for_history: { dateRange: "custom" },
    },
  ];
}

// ── Detector 2: Overall Failure Rate ───────────────────────────
function detectFailureRate(
  readings: Reading[],
  equipment: Equipment[],
): TemperaturePattern[] {
  if (readings.length < MIN_READINGS) return [];

  const failures = readings.filter((r) => !r.temp_pass);
  const failureRate = (failures.length / readings.length) * 100;

  const patterns: TemperaturePattern[] = [];

  if (failureRate > HIGH_FAILURE_RATE_PCT && failures.length >= MIN_FAILURES) {
    const confidence = Math.min(
      95,
      Math.round(50 + failureRate * 1.2 + failures.length * 0.5),
    );
    patterns.push({
      detector: "failure_rate",
      prp: "reduce",
      title: `Overall failure rate at ${Math.round(failureRate)}%`,
      evidence_summary: `${failures.length} of ${readings.length} readings failed (${Math.round(failureRate)}%). Threshold: ${HIGH_FAILURE_RATE_PCT}%. Equipment involved: ${[...new Set(failures.map((f) => equipment.find((e) => e.id === f.equipment_id)?.name || "Unknown"))].join(", ")}.`,
      suggested_action:
        "Identify the top failing equipment units and investigate root causes — calibration, door seals, placement, or loading patterns.",
      confidence_pct: confidence,
      filter_for_history: { status: "fail" },
    });
  }

  if (
    failureRate <= CLEAN_FAILURE_RATE_PCT &&
    readings.length >= 20 &&
    failures.length === 0
  ) {
    patterns.push({
      detector: "failure_rate",
      prp: "prove",
      title: "Zero failures recorded",
      evidence_summary: `${readings.length} readings with 0 failures (0.0%). A clean record across all equipment.`,
      suggested_action:
        "Maintain current practices. This record demonstrates consistent temperature control.",
      confidence_pct: 90,
    });
  }

  return patterns;
}

// ── Detector 3: Day-of-Week Clustering ─────────────────────────
function detectDayOfWeekClustering(readings: Reading[]): TemperaturePattern[] {
  const failures = readings.filter((r) => !r.temp_pass);
  if (failures.length < MIN_FAILURES) return [];

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const byDay: Record<number, { total: number; failures: number }> = {};
  for (let d = 0; d < 7; d++) byDay[d] = { total: 0, failures: 0 };

  for (const r of readings) {
    const day = new Date(r.reading_time).getDay();
    byDay[day].total++;
    if (!r.temp_pass) byDay[day].failures++;
  }

  const overallRate = failures.length / readings.length;
  const patterns: TemperaturePattern[] = [];

  for (let d = 0; d < 7; d++) {
    const { total, failures: dayFails } = byDay[d];
    if (total < 3 || dayFails < MIN_FAILURES) continue;
    const dayRate = dayFails / total;
    if (dayRate > overallRate * FAILURE_RATE_RATIO_THRESHOLD) {
      const confidence = Math.min(
        90,
        Math.round(50 + (dayRate / overallRate) * 10 + dayFails * 2),
      );
      patterns.push({
        detector: "day_of_week_clustering",
        prp: "predict",
        title: `${dayNames[d]}s show ${Math.round(dayRate * 100)}% failure rate`,
        evidence_summary: `${dayFails} of ${total} readings on ${dayNames[d]}s failed (${Math.round(dayRate * 100)}%). Overall rate: ${Math.round(overallRate * 100)}%. Ratio: ${(dayRate / overallRate).toFixed(1)}x the average.`,
        suggested_action: `Investigate ${dayNames[d]} operations — staffing changes, delivery schedules, or equipment load patterns unique to that day.`,
        confidence_pct: confidence,
      });
    }
  }

  return patterns;
}

// ── Detector 4: Time-of-Day Clustering ─────────────────────────
function detectTimeOfDayClustering(readings: Reading[]): TemperaturePattern[] {
  const failures = readings.filter((r) => !r.temp_pass);
  if (failures.length < MIN_FAILURES) return [];

  const buckets: Record<
    string,
    { label: string; total: number; failures: number }
  > = {
    morning: { label: "Morning (6am–12pm)", total: 0, failures: 0 },
    afternoon: { label: "Afternoon (12pm–5pm)", total: 0, failures: 0 },
    evening: { label: "Evening (5pm–10pm)", total: 0, failures: 0 },
    overnight: { label: "Overnight (10pm–6am)", total: 0, failures: 0 },
  };

  for (const r of readings) {
    const hour = new Date(r.reading_time).getHours();
    const bucket =
      hour >= 6 && hour < 12
        ? "morning"
        : hour >= 12 && hour < 17
          ? "afternoon"
          : hour >= 17 && hour < 22
            ? "evening"
            : "overnight";
    buckets[bucket].total++;
    if (!r.temp_pass) buckets[bucket].failures++;
  }

  const overallRate = failures.length / readings.length;
  const patterns: TemperaturePattern[] = [];

  for (const [key, bucket] of Object.entries(buckets)) {
    if (bucket.total < 3 || bucket.failures < MIN_FAILURES) continue;
    const bucketRate = bucket.failures / bucket.total;
    if (bucketRate > overallRate * FAILURE_RATE_RATIO_THRESHOLD) {
      const confidence = Math.min(
        90,
        Math.round(50 + (bucketRate / overallRate) * 10 + bucket.failures * 2),
      );
      patterns.push({
        detector: "time_of_day_clustering",
        prp: "predict",
        title: `${bucket.label} has elevated failures`,
        evidence_summary: `${bucket.failures} of ${bucket.total} ${key} readings failed (${Math.round(bucketRate * 100)}%). Overall rate: ${Math.round(overallRate * 100)}%. Ratio: ${(bucketRate / overallRate).toFixed(1)}x the average.`,
        suggested_action: `Review ${key} shift procedures — pre-shift equipment checks, door discipline, and stocking practices during this window.`,
        confidence_pct: confidence,
        filter_for_history: { shift: key },
      });
    }
  }

  return patterns;
}

// ── Detector 5: Equipment-Specific Failure Rate ────────────────
function detectEquipmentFailureRate(
  readings: Reading[],
  equipment: Equipment[],
): TemperaturePattern[] {
  const failures = readings.filter((r) => !r.temp_pass);
  if (failures.length < MIN_FAILURES) return [];

  const overallRate = failures.length / readings.length;
  const byEquipment: Record<
    string,
    { total: number; failures: number; name: string }
  > = {};

  for (const r of readings) {
    if (!byEquipment[r.equipment_id]) {
      const eq = equipment.find((e) => e.id === r.equipment_id);
      byEquipment[r.equipment_id] = {
        total: 0,
        failures: 0,
        name: eq?.name || "Unknown",
      };
    }
    byEquipment[r.equipment_id].total++;
    if (!r.temp_pass) byEquipment[r.equipment_id].failures++;
  }

  const patterns: TemperaturePattern[] = [];

  for (const [eqId, data] of Object.entries(byEquipment)) {
    if (data.total < 5 || data.failures < MIN_FAILURES) continue;
    const eqRate = data.failures / data.total;
    if (eqRate > overallRate * FAILURE_RATE_RATIO_THRESHOLD) {
      const confidence = Math.min(
        90,
        Math.round(50 + (eqRate / overallRate) * 10 + data.failures * 2),
      );
      patterns.push({
        detector: "equipment_failure_rate",
        prp: "reduce",
        title: `${data.name} failing at ${Math.round(eqRate * 100)}%`,
        evidence_summary: `${data.failures} of ${data.total} readings for ${data.name} failed (${Math.round(eqRate * 100)}%). Fleet average: ${Math.round(overallRate * 100)}%. This unit fails ${(eqRate / overallRate).toFixed(1)}x more often.`,
        suggested_action: `Inspect ${data.name} — check door gaskets, thermostat calibration, condenser coils, and placement away from heat sources.`,
        confidence_pct: confidence,
        equipment_name: data.name,
        filter_for_history: { equipment: eqId, status: "fail" },
      });
    }
  }

  return patterns;
}

// ── Detector 6: Recurring Failures ─────────────────────────────
function detectRecurringFailures(
  readings: Reading[],
  equipment: Equipment[],
): TemperaturePattern[] {
  const byEquipment: Record<string, Reading[]> = {};
  for (const r of readings) {
    if (!byEquipment[r.equipment_id]) byEquipment[r.equipment_id] = [];
    byEquipment[r.equipment_id].push(r);
  }

  const patterns: TemperaturePattern[] = [];

  for (const [eqId, eqReadings] of Object.entries(byEquipment)) {
    // Readings are already sorted by reading_time ASC
    let maxConsecutive = 0;
    let currentStreak = 0;

    for (const r of eqReadings) {
      if (!r.temp_pass) {
        currentStreak++;
        maxConsecutive = Math.max(maxConsecutive, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    if (maxConsecutive >= 3) {
      const eq = equipment.find((e) => e.id === eqId);
      const name = eq?.name || "Unknown";
      const totalFails = eqReadings.filter((r) => !r.temp_pass).length;
      const confidence = Math.min(
        95,
        Math.round(60 + maxConsecutive * 8 + totalFails * 1.5),
      );
      patterns.push({
        detector: "recurring_failures",
        prp: "reduce",
        title: `${name} had ${maxConsecutive} consecutive failures`,
        evidence_summary: `${name} recorded ${maxConsecutive} back-to-back out-of-range readings (${totalFails} total failures out of ${eqReadings.length} readings). Consecutive failures suggest a persistent issue, not a one-off.`,
        suggested_action: `Take ${name} out of service for inspection. Check compressor operation, refrigerant levels, and thermostat accuracy. Do not resume use until verified in range.`,
        confidence_pct: confidence,
        equipment_name: name,
        filter_for_history: { equipment: eqId },
      });
    }
  }

  return patterns;
}

// ── Detector 7: Temperature Drift ──────────────────────────────
function detectTemperatureDrift(
  readings: Reading[],
  equipment: Equipment[],
): TemperaturePattern[] {
  const byEquipment: Record<string, Reading[]> = {};
  for (const r of readings) {
    if (!byEquipment[r.equipment_id]) byEquipment[r.equipment_id] = [];
    byEquipment[r.equipment_id].push(r);
  }

  const patterns: TemperaturePattern[] = [];

  for (const [eqId, eqReadings] of Object.entries(byEquipment)) {
    if (eqReadings.length < MIN_READINGS) continue;

    const thirdSize = Math.floor(eqReadings.length / 3);
    if (thirdSize < 3) continue;

    const firstThird = eqReadings.slice(0, thirdSize);
    const lastThird = eqReadings.slice(-thirdSize);

    const avgFirst =
      firstThird.reduce((s, r) => s + r.temperature, 0) / firstThird.length;
    const avgLast =
      lastThird.reduce((s, r) => s + r.temperature, 0) / lastThird.length;
    const drift = avgLast - avgFirst;

    if (Math.abs(drift) >= DRIFT_THRESHOLD_F) {
      const eq = equipment.find((e) => e.id === eqId);
      const name = eq?.name || "Unknown";
      const direction = drift > 0 ? "warming" : "cooling";
      const confidence = Math.min(
        90,
        Math.round(
          50 +
            (Math.abs(drift) / DRIFT_THRESHOLD_F) * 15 +
            eqReadings.length * 0.15,
        ),
      );

      patterns.push({
        detector: "temperature_drift",
        prp: "predict",
        title: `${name} is ${direction} — ${Math.abs(drift).toFixed(1)}°F drift`,
        evidence_summary: `${name} averaged ${avgFirst.toFixed(1)}°F in the first third of the window (${firstThird.length} readings) and ${avgLast.toFixed(1)}°F in the last third (${lastThird.length} readings). Net drift: ${drift > 0 ? "+" : ""}${drift.toFixed(1)}°F.`,
        suggested_action: `${direction === "warming" ? "Check compressor performance, condenser coils, and door seal integrity" : "Verify thermostat setting — overcooling wastes energy and may freeze product"}. Schedule a calibration check for ${name}.`,
        confidence_pct: confidence,
        equipment_name: name,
        filter_for_history: { equipment: eqId },
      });
    }
  }

  return patterns;
}

// ── Detector 8: Sensor vs Probe Agreement ─────────────────────
function detectSensorProbeAgreement(
  readings: Reading[],
  equipment: Equipment[],
): TemperaturePattern[] {
  // Group readings by equipment and input method
  const byEquipment: Record<
    string,
    { sensor: Reading[]; manual: Reading[] }
  > = {};

  for (const r of readings) {
    if (!byEquipment[r.equipment_id]) {
      byEquipment[r.equipment_id] = { sensor: [], manual: [] };
    }
    if (r.input_method === "iot_sensor") {
      byEquipment[r.equipment_id].sensor.push(r);
    } else if (r.input_method === "manual") {
      byEquipment[r.equipment_id].manual.push(r);
    }
  }

  const patterns: TemperaturePattern[] = [];

  for (const [eqId, data] of Object.entries(byEquipment)) {
    if (data.sensor.length === 0 || data.manual.length === 0) continue;

    // Find matched pairs within 10-minute windows (greedy nearest match)
    const pairs: { diff: number }[] = [];
    const usedManual = new Set<number>();

    for (const sr of data.sensor) {
      const sTime = new Date(sr.reading_time).getTime();
      let bestIdx = -1;
      let bestDist = Infinity;

      for (let mi = 0; mi < data.manual.length; mi++) {
        if (usedManual.has(mi)) continue;
        const mTime = new Date(data.manual[mi].reading_time).getTime();
        const dist = Math.abs(sTime - mTime);
        if (dist <= SENSOR_PROBE_MATCH_WINDOW_MS && dist < bestDist) {
          bestDist = dist;
          bestIdx = mi;
        }
      }

      if (bestIdx >= 0) {
        usedManual.add(bestIdx);
        const diff = Math.abs(sr.temperature - data.manual[bestIdx].temperature);
        pairs.push({ diff });
      }
    }

    if (pairs.length === 0) continue;

    const mad = pairs.reduce((s, p) => s + p.diff, 0) / pairs.length;
    const maxDiff = Math.max(...pairs.map((p) => p.diff));
    const eq = equipment.find((e) => e.id === eqId);
    const name = eq?.name || "Unknown";

    if (
      mad > SENSOR_PROBE_DISAGREE_THRESHOLD_F &&
      pairs.length >= SENSOR_PROBE_MIN_PAIRS_REDUCE
    ) {
      const confidence = Math.min(
        95,
        Math.round(50 + pairs.length * 1.2 + mad * 5),
      );
      patterns.push({
        detector: "sensor_probe_agreement",
        prp: "reduce",
        title: `Sensor and probe disagree on ${name}`,
        evidence_summary: `Mean difference: ${mad.toFixed(1)}°F across ${pairs.length} matched pairs. Max difference: ${maxDiff.toFixed(1)}°F. Threshold: ${SENSOR_PROBE_DISAGREE_THRESHOLD_F}°F.`,
        suggested_action: `Verify sensor placement and probe calibration for ${name}. Check that the sensor probe tip is positioned correctly inside the unit.`,
        confidence_pct: confidence,
        equipment_name: name,
        filter_for_history: { equipment: eqId },
      });
    } else if (
      mad <= SENSOR_PROBE_AGREE_THRESHOLD_F &&
      pairs.length >= SENSOR_PROBE_MIN_PAIRS_PROVE
    ) {
      const confidence = Math.min(
        95,
        Math.round(50 + pairs.length * 0.8 + (1 - mad) * 10),
      );
      patterns.push({
        detector: "sensor_probe_agreement",
        prp: "prove",
        title: `${name} sensor and probe agree consistently`,
        evidence_summary: `Mean difference: ${mad.toFixed(1)}°F across ${pairs.length} matched pairs. Threshold: ${SENSOR_PROBE_AGREE_THRESHOLD_F}°F.`,
        suggested_action:
          "Calibration confirmed. Continue current routine.",
        confidence_pct: confidence,
        equipment_name: name,
        filter_for_history: { equipment: eqId },
      });
    }
  }

  return patterns;
}

// ── Detector 9: Coverage Gap Patterns ─────────────────────────
function isHoldingType(eqType: string): boolean {
  return eqType.includes("holding") || eqType === "hot_hold";
}

function isStorageType(eqType: string): boolean {
  return (
    [
      "walk_in_cooler",
      "walk_in_freezer",
      "reach_in_cooler",
      "reach_in_freezer",
      "prep_table",
      "cooler",
      "freezer",
    ].includes(eqType) || eqType.includes("storage")
  );
}

interface DetectedGap {
  equipmentId: string;
  equipmentName: string;
  gapStartMs: number;
}

function detectCoverageGapPatterns(
  readings: Reading[],
  equipment: Equipment[],
  windowStart: Date,
  windowEnd: Date,
): TemperaturePattern[] {
  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  if (windowEndMs <= windowStartMs) return [];

  const qualifying = equipment.filter(
    (eq) => isHoldingType(eq.equipment_type) || isStorageType(eq.equipment_type),
  );

  const gaps: DetectedGap[] = [];

  for (const eq of qualifying) {
    const intervalMinutes = isHoldingType(eq.equipment_type)
      ? HOT_HOLDING_OVERDUE_MINUTES
      : EQUIPMENT_CHECK_OVERDUE_MINUTES;
    const intervalMs = intervalMinutes * 60_000;

    const timestamps = readings
      .filter((r) => r.equipment_id === eq.id)
      .map((r) => new Date(r.reading_time).getTime())
      .sort((a, b) => a - b);

    let cursor = windowStartMs;
    while (cursor < windowEndMs) {
      const end = Math.min(cursor + intervalMs, windowEndMs);
      const hasReading = timestamps.some((ts) => ts >= cursor && ts < end);
      if (!hasReading) {
        gaps.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          gapStartMs: cursor,
        });
      }
      cursor = end;
    }
  }

  if (gaps.length < MIN_GAPS_FOR_PATTERN) return [];

  const patterns: TemperaturePattern[] = [];
  const totalGaps = gaps.length;

  // Group by time-of-day bucket (4 x 6-hour buckets)
  const timeBuckets: Record<string, { label: string; count: number }> = {
    overnight: { label: "Overnight (12am\u20136am)", count: 0 },
    morning: { label: "Morning (6am\u201312pm)", count: 0 },
    afternoon: { label: "Afternoon (12pm\u20136pm)", count: 0 },
    evening: { label: "Evening (6pm\u201312am)", count: 0 },
  };

  for (const g of gaps) {
    const hour = new Date(g.gapStartMs).getHours();
    const bucket =
      hour < 6
        ? "overnight"
        : hour < 12
          ? "morning"
          : hour < 18
            ? "afternoon"
            : "evening";
    timeBuckets[bucket].count++;
  }

  for (const [key, bucket] of Object.entries(timeBuckets)) {
    const ratio = bucket.count / totalGaps;
    if (
      ratio >= GAP_CONCENTRATION_THRESHOLD &&
      bucket.count >= MIN_GAPS_FOR_PATTERN
    ) {
      const confidence = Math.min(
        90,
        Math.round(50 + ratio * 30 + bucket.count * 1.5),
      );
      patterns.push({
        detector: "coverage_gap_patterns",
        prp: "predict",
        title: `Coverage gap risk window: ${bucket.label}`,
        evidence_summary: `${bucket.count} of ${totalGaps} detected gaps (${Math.round(ratio * 100)}%) fall in the ${key} window.`,
        suggested_action: `Add a ${key} reading reminder or assign a specific team member to cover ${key} checks.`,
        confidence_pct: confidence,
      });
    }
  }

  // Group by day-of-week
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const g of gaps) {
    dayCounts[new Date(g.gapStartMs).getDay()]++;
  }

  for (let d = 0; d < 7; d++) {
    const ratio = dayCounts[d] / totalGaps;
    if (
      ratio >= GAP_CONCENTRATION_THRESHOLD &&
      dayCounts[d] >= MIN_GAPS_FOR_PATTERN
    ) {
      const confidence = Math.min(
        90,
        Math.round(50 + ratio * 30 + dayCounts[d] * 1.5),
      );
      patterns.push({
        detector: "coverage_gap_patterns",
        prp: "predict",
        title: `${dayNames[d]}s show consistent coverage gaps`,
        evidence_summary: `${dayCounts[d]} of ${totalGaps} detected gaps (${Math.round(ratio * 100)}%) occur on ${dayNames[d]}s.`,
        suggested_action: `Review ${dayNames[d]} staffing and shift coverage. Ensure temperature checks are assigned before shift ends.`,
        confidence_pct: confidence,
      });
    }
  }

  // Group by equipment
  const eqCounts: Record<string, { name: string; count: number }> = {};
  for (const g of gaps) {
    if (!eqCounts[g.equipmentId]) {
      eqCounts[g.equipmentId] = { name: g.equipmentName, count: 0 };
    }
    eqCounts[g.equipmentId].count++;
  }

  for (const [eqId, data] of Object.entries(eqCounts)) {
    const ratio = data.count / totalGaps;
    if (
      ratio >= GAP_CONCENTRATION_THRESHOLD &&
      data.count >= MIN_GAPS_FOR_PATTERN
    ) {
      const confidence = Math.min(
        90,
        Math.round(50 + ratio * 30 + data.count * 1.5),
      );
      patterns.push({
        detector: "coverage_gap_patterns",
        prp: "predict",
        title: `${data.name} accounts for ${Math.round(ratio * 100)}% of gaps`,
        evidence_summary: `${data.count} of ${totalGaps} detected gaps are on ${data.name}. This unit may be overlooked during rounds.`,
        suggested_action: `Add ${data.name} to the standard walk-through checklist. Consider placing a visual reminder near the unit.`,
        confidence_pct: confidence,
        equipment_name: data.name,
        filter_for_history: { equipment: eqId },
      });
    }
  }

  return patterns;
}

// ── Statistical Number Guard ──────────────────────────────────
function preserveStatisticalNumbers(
  original: string,
  rewritten: string,
): boolean {
  const originalNumbers = original.match(/\d+(\.\d+)?/g) || [];
  return originalNumbers.every((num) => rewritten.includes(num));
}

// ── AI Summarization ───────────────────────────────────────────
async function aiSummarize(
  patterns: TemperaturePattern[],
  apiKey: string,
): Promise<TemperaturePattern[]> {
  const systemPrompt = `You are EvidLY's pattern insights assistant. The statistical pattern detector has identified the following patterns in this kitchen's temperature data. Rewrite each pattern's title and evidence_summary in clear, plain English for a kitchen leader. Keep the statistical numbers exact. Do not invent or interpret beyond the data provided. Use the suggested_action as-is unless it can be made more specific based on the equipment context.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Rewrite the title and evidence_summary for each pattern. Return valid JSON array with the same structure.\n\n${JSON.stringify(patterns)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error(
      "[analyze-temperature-patterns] AI summarization failed:",
      await res.text(),
    );
    return patterns; // Graceful fallback
  }

  const data = await res.json();
  const text =
    data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") || "";

  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return patterns;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length !== patterns.length) {
      return patterns;
    }
    // Only replace title and evidence_summary if all statistical numbers survived
    return patterns.map((p, i) => ({
      ...p,
      title:
        typeof parsed[i]?.title === "string" &&
        preserveStatisticalNumbers(p.title, parsed[i].title)
          ? parsed[i].title
          : p.title,
      evidence_summary:
        typeof parsed[i]?.evidence_summary === "string" &&
        preserveStatisticalNumbers(
          p.evidence_summary,
          parsed[i].evidence_summary,
        )
          ? parsed[i].evidence_summary
          : p.evidence_summary,
    }));
  } catch {
    return patterns; // Malformed AI output → graceful fallback
  }
}

// ── Main Handler ───────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    // Get org + facility
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return jsonResponse({ error: "No organization found" }, 400);
    }

    const orgId = profile.organization_id;

    // Get facility
    const { data: facilities } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1);

    const facilityId = facilities?.[0]?.id || null;

    const { window_days = 30, force_refresh = false } = await req.json();

    // Check cache
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from("temperature_pattern_analysis")
        .select("*")
        .eq("organization_id", orgId)
        .eq("window_days", window_days)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (cached && cached.length > 0) {
        return jsonResponse({
          patterns: cached[0].patterns,
          tier: cached[0].tier,
          readings_count: cached[0].readings_count,
          ai_disclaimer: cached[0].ai_disclaimer,
          ai_summarized: cached[0].ai_summarized,
          cached: true,
        });
      }
    }

    // Fetch readings
    const cutoff = new Date(
      Date.now() - window_days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const readingsQuery = supabase
      .from("temperature_logs")
      .select(
        "id, equipment_id, temperature, temp_pass, reading_time, input_method, shift, log_type",
      )
      .gte("reading_time", cutoff)
      .order("reading_time", { ascending: true });

    if (facilityId) {
      readingsQuery.eq("facility_id", facilityId);
    }

    const { data: readings, error: readingsError } = await readingsQuery;

    if (readingsError) {
      return jsonResponse({ error: "Failed to fetch readings" }, 500);
    }

    // Fetch equipment
    const eqQuery = supabase
      .from("temperature_equipment")
      .select("id, name, equipment_type, min_temp, max_temp");

    if (facilityId) {
      eqQuery.eq("facility_id", facilityId);
    }

    const { data: equipment } = await eqQuery;
    const eqList = equipment || [];

    const tier = determineTier(readings || []);
    const allReadings = readings || [];
    const allPatterns: TemperaturePattern[] = [];
    let partialError = false;
    const windowStartDate = new Date(
      Date.now() - window_days * 24 * 60 * 60 * 1000,
    );
    const windowEndDate = new Date();

    // Run detectors based on tier
    if (tier >= 1) {
      try {
        allPatterns.push(...detectComplianceTrend(allReadings, window_days));
      } catch (e) {
        console.error("[detector] compliance_trend error:", e);
        partialError = true;
      }
      try {
        allPatterns.push(...detectFailureRate(allReadings, eqList));
      } catch (e) {
        console.error("[detector] failure_rate error:", e);
        partialError = true;
      }
    }

    if (tier >= 2) {
      try {
        allPatterns.push(...detectDayOfWeekClustering(allReadings));
      } catch (e) {
        console.error("[detector] day_of_week error:", e);
        partialError = true;
      }
      try {
        allPatterns.push(...detectTimeOfDayClustering(allReadings));
      } catch (e) {
        console.error("[detector] time_of_day error:", e);
        partialError = true;
      }
      try {
        allPatterns.push(...detectEquipmentFailureRate(allReadings, eqList));
      } catch (e) {
        console.error("[detector] equipment_failure error:", e);
        partialError = true;
      }
      try {
        allPatterns.push(...detectRecurringFailures(allReadings, eqList));
      } catch (e) {
        console.error("[detector] recurring_failures error:", e);
        partialError = true;
      }
      try {
        allPatterns.push(...detectTemperatureDrift(allReadings, eqList));
      } catch (e) {
        console.error("[detector] temperature_drift error:", e);
        partialError = true;
      }
      try {
        allPatterns.push(
          ...detectSensorProbeAgreement(allReadings, eqList),
        );
      } catch (e) {
        console.error("[detector] sensor_probe_agreement error:", e);
        partialError = true;
      }
      try {
        allPatterns.push(
          ...detectCoverageGapPatterns(
            allReadings,
            eqList,
            windowStartDate,
            windowEndDate,
          ),
        );
      } catch (e) {
        console.error("[detector] coverage_gap_patterns error:", e);
        partialError = true;
      }
    }

    // AI summarization
    let aiSummarized = false;
    let finalPatterns = allPatterns;
    let aiDisclaimer =
      "Patterns identified via statistical analysis of your operational data. Statistical basis cited per pattern. Confidence scores reflect significance of the pattern, not certainty of the recommendation. Review the underlying data before acting on suggestions.";

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      aiDisclaimer +=
        " AI summarization unavailable — showing raw statistical output.";
      aiSummarized = false;
    } else if (allPatterns.length > 0) {
      try {
        finalPatterns = await aiSummarize(allPatterns, anthropicKey);
        aiSummarized = true;
      } catch (e) {
        console.error("[ai-summarize] error:", e);
        finalPatterns = allPatterns;
        aiSummarized = false;
        aiDisclaimer +=
          " AI summarization failed — showing raw statistical output.";
      }
    }

    // Cache result
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    try {
      await supabase.from("temperature_pattern_analysis").insert({
        organization_id: orgId,
        facility_id: facilityId,
        window_days,
        readings_count: allReadings.length,
        tier,
        patterns: finalPatterns,
        ai_disclaimer: aiDisclaimer,
        ai_summarized: aiSummarized,
        expires_at: expiresAt,
      });
    } catch {
      // Silent fail — caching is non-critical
    }

    return jsonResponse({
      patterns: finalPatterns,
      tier,
      readings_count: allReadings.length,
      ai_disclaimer: aiDisclaimer,
      ai_summarized: aiSummarized,
      partial_error: partialError,
      cached: false,
    });
  } catch (err: unknown) {
    console.error("[analyze-temperature-patterns] error:", err);
    return jsonResponse(
      { error: (err as Error).message || "Internal server error" },
      500,
    );
  }
});
