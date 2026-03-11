// ── Temperature Anomaly Detection Engine ─────────────────────────
// Z-score anomaly detection with trend analysis.
// Catches equipment trending toward failure before crossing thresholds.

export interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  severity: 'normal' | 'watch' | 'warning' | 'critical';
  message: string;
  trend: 'stable' | 'warming' | 'cooling' | 'erratic';
}

export function calculateAnomaly(
  currentReading: number,
  historicalReadings: number[],
  minTemp: number,
  maxTemp: number
): AnomalyResult {
  if (historicalReadings.length < 5) {
    return { isAnomaly: false, zScore: 0, severity: 'normal', message: '', trend: 'stable' };
  }

  const mean = historicalReadings.reduce((a, b) => a + b, 0) / historicalReadings.length;
  const std = Math.sqrt(
    historicalReadings.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / historicalReadings.length
  );

  const zScore = std > 0 ? Math.abs(currentReading - mean) / std : 0;

  // Trend: compare last 5 readings
  const recent = historicalReadings.slice(-5);
  const trendSlope = (recent[recent.length - 1] - recent[0]) / recent.length;
  const trend: AnomalyResult['trend'] =
    Math.abs(trendSlope) < 0.2 ? 'stable' :
    trendSlope > 0 ? 'warming' :
    trendSlope < -0.3 ? 'cooling' : 'erratic';

  const effectiveMin = minTemp === -Infinity ? -10 : minTemp;
  const isActuallyPassing = currentReading >= effectiveMin && currentReading <= maxTemp;

  let severity: AnomalyResult['severity'] = 'normal';
  let message = '';

  if (zScore > 3.0 && isActuallyPassing && (trend === 'warming' || trend === 'erratic')) {
    severity = 'warning';
    message = `Temperature trending ${trendSlope > 0 ? 'up' : 'erratically'} and statistically abnormal (${zScore.toFixed(1)}σ). Recommend inspection.`;
  } else if (zScore > 2.5 && isActuallyPassing) {
    severity = 'watch';
    message = `Reading is ${zScore.toFixed(1)}σ from the 30-day average — unusual but passing.`;
  }

  if (!isActuallyPassing && zScore > 2.0) {
    severity = 'critical';
    message = `Out of range and ${zScore.toFixed(1)}σ from normal. Equipment may need service.`;
  }

  return { isAnomaly: zScore > 2.5, zScore, severity, message, trend };
}
