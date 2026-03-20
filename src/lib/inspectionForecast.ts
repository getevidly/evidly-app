// SUPERPOWERS-APP-01 — SP1: Inspection Forecast
// Advisory-only prediction of next inspection window based on county patterns

export interface InspectionFactor {
  label: string;
  detail: string;
  impact: 'increases_likelihood' | 'decreases_likelihood' | 'neutral';
}

export interface InspectionForecast {
  earliestDate: Date;
  latestDate: Date;
  daysUntilEarliest: number;
  daysUntilLatest: number;
  confidence: number; // 0-100
  riskLevel: 'low' | 'moderate' | 'high';
  factors: InspectionFactor[];
}

interface GradingConfig {
  inspection_frequency?: string; // annual, semi_annual, quarterly, risk_based
  risk_categories?: Record<string, unknown>;
}

/**
 * Compute an advisory inspection forecast window.
 * All output is ADVISORY — never declarative. Uses "estimated", "may", "projected".
 */
export function computeInspectionForecast(
  lastInspectionDate: Date | null,
  county: string | null,
  gradingConfig: GradingConfig | null,
): InspectionForecast | null {
  if (!lastInspectionDate) return null;

  const now = new Date();
  const daysSinceLast = Math.floor((now.getTime() - lastInspectionDate.getTime()) / 86400000);

  // Determine inspection cycle length based on jurisdiction frequency
  const frequency = gradingConfig?.inspection_frequency || 'annual';
  const cycleDays = getCycleDays(frequency);

  // Estimate window: earliest = 80% of cycle, latest = 120% of cycle
  const earliestOffset = Math.floor(cycleDays * 0.8);
  const latestOffset = Math.floor(cycleDays * 1.2);

  const earliestDate = new Date(lastInspectionDate.getTime() + earliestOffset * 86400000);
  const latestDate = new Date(lastInspectionDate.getTime() + latestOffset * 86400000);

  const daysUntilEarliest = Math.max(0, Math.floor((earliestDate.getTime() - now.getTime()) / 86400000));
  const daysUntilLatest = Math.max(0, Math.floor((latestDate.getTime() - now.getTime()) / 86400000));

  // Confidence: higher when we have more data points
  const confidence = county && gradingConfig ? 72 : county ? 55 : 40;

  // Risk level based on position in cycle
  const cycleProgress = daysSinceLast / cycleDays;
  const riskLevel: 'low' | 'moderate' | 'high' =
    cycleProgress >= 0.9 ? 'high' :
    cycleProgress >= 0.7 ? 'moderate' :
    'low';

  // Build advisory factors
  const factors: InspectionFactor[] = [];

  factors.push({
    label: 'Time Since Last Inspection',
    detail: `${daysSinceLast} days since last inspection (${frequency.replace('_', '-')} cycle)`,
    impact: cycleProgress >= 0.8 ? 'increases_likelihood' : 'neutral',
  });

  if (county) {
    factors.push({
      label: 'Jurisdiction Pattern',
      detail: `${county} typically follows a ${frequency.replace('_', '-')} inspection schedule`,
      impact: 'neutral',
    });
  }

  if (cycleProgress > 1.0) {
    factors.push({
      label: 'Overdue Window',
      detail: 'Past the typical inspection cycle — inspection may occur at any time',
      impact: 'increases_likelihood',
    });
  }

  return {
    earliestDate,
    latestDate,
    daysUntilEarliest,
    daysUntilLatest,
    confidence,
    riskLevel,
    factors,
  };
}

function getCycleDays(frequency: string): number {
  switch (frequency) {
    case 'quarterly': return 90;
    case 'semi_annual': return 180;
    case 'risk_based': return 270; // average of risk-based cycles
    case 'annual':
    default: return 365;
  }
}
