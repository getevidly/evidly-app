// SUPERPOWERS-APP-01 — SP2: Violation Risk Radar
// Advisory-only analysis of what an inspector may flag

export interface ViolationRisk {
  category: string;
  description: string;
  probability: number; // 0-100
  severity: 'critical' | 'major' | 'minor';
  source: string;
  suggestedAction: string;
}

interface RadarInput {
  openCorrectiveActions: number;
  overdueCorrectiveActions: number;
  tempFailuresLast7Days: number;
  expiredDocuments: number;
  overdueServiceRecords: number;
  daysWithoutTempLog: number;
}

const SEVERITY_WEIGHT = { critical: 3, major: 2, minor: 1 };

/**
 * Compute violation risks based on current operational state.
 * All output is advisory — uses "may", "estimated", "potential".
 */
export function computeViolationRisks(input: RadarInput): ViolationRisk[] {
  const risks: ViolationRisk[] = [];

  // Temperature Control risks
  if (input.tempFailuresLast7Days > 0) {
    risks.push({
      category: 'Temperature Control',
      description: `${input.tempFailuresLast7Days} temperature reading(s) outside safe range in the past 7 days`,
      probability: Math.min(85, 40 + input.tempFailuresLast7Days * 15),
      severity: input.tempFailuresLast7Days >= 3 ? 'critical' : 'major',
      source: 'Temperature logs',
      suggestedAction: 'Review temperature monitoring procedures and verify equipment calibration',
    });
  }

  if (input.daysWithoutTempLog > 1) {
    risks.push({
      category: 'Temperature Control',
      description: `${input.daysWithoutTempLog} day(s) without a temperature reading`,
      probability: Math.min(70, 30 + input.daysWithoutTempLog * 10),
      severity: input.daysWithoutTempLog >= 3 ? 'major' : 'minor',
      source: 'Temperature log gaps',
      suggestedAction: 'Ensure temperature checks are completed at required intervals',
    });
  }

  // Documentation risks
  if (input.expiredDocuments > 0) {
    risks.push({
      category: 'Documentation',
      description: `${input.expiredDocuments} expired document(s) that may be requested during inspection`,
      probability: Math.min(90, 50 + input.expiredDocuments * 15),
      severity: input.expiredDocuments >= 3 ? 'critical' : 'major',
      source: 'Document tracker',
      suggestedAction: 'Renew expired permits, certifications, or compliance documents',
    });
  }

  // Corrective Action risks
  if (input.overdueCorrectiveActions > 0) {
    risks.push({
      category: 'Food Safety Procedures',
      description: `${input.overdueCorrectiveActions} overdue corrective action(s) not yet resolved`,
      probability: Math.min(80, 45 + input.overdueCorrectiveActions * 12),
      severity: 'critical',
      source: 'Corrective action log',
      suggestedAction: 'Prioritize resolving overdue corrective actions before next inspection',
    });
  } else if (input.openCorrectiveActions > 0) {
    risks.push({
      category: 'Food Safety Procedures',
      description: `${input.openCorrectiveActions} open corrective action(s) currently in progress`,
      probability: Math.min(50, 20 + input.openCorrectiveActions * 8),
      severity: 'minor',
      source: 'Corrective action log',
      suggestedAction: 'Continue progress on open corrective actions and document resolutions',
    });
  }

  // Equipment Maintenance risks
  if (input.overdueServiceRecords > 0) {
    risks.push({
      category: 'Equipment Maintenance',
      description: `${input.overdueServiceRecords} overdue equipment service record(s)`,
      probability: Math.min(65, 25 + input.overdueServiceRecords * 12),
      severity: input.overdueServiceRecords >= 2 ? 'major' : 'minor',
      source: 'Service records',
      suggestedAction: 'Schedule overdue equipment maintenance and update service records',
    });
  }

  // Sort by risk score (probability × severity weight)
  return risks.sort((a, b) => {
    const scoreA = a.probability * SEVERITY_WEIGHT[a.severity];
    const scoreB = b.probability * SEVERITY_WEIGHT[b.severity];
    return scoreB - scoreA;
  });
}
