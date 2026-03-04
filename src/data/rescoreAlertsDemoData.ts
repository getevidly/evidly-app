// ── GAP-11: Re-Score Alerts Demo Data ─────────────────────────────────
// AUDIT: No re-score alert system existed prior. This is new.
// UPSTREAM: Consumes data from GAP-01 (corrective actions), GAP-06 (training),
//   GAP-07 (equipment), GAP-09 (incidents), GAP-10 (correlation signals).
// PURPOSE: Alert operators when compliance data changes warrant a score review.
// ──────────────────────────────────────────────────────────────────────

export type AlertPillar = 'food' | 'fire' | 'both';
export type AlertSeverity = 'critical' | 'high' | 'medium';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AlertTriggerType =
  | 'corrective_action'
  | 'certification'
  | 'equipment'
  | 'incident'
  | 'signal'
  | 'inspection_score';

export interface ReScoreAlert {
  id: string;
  facilityId: string;
  facilityName: string;
  pillar: AlertPillar;
  triggerSource: string;
  triggerRecordType: AlertTriggerType;
  triggerRecordId: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600000).toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// ── Trigger Evaluation Engine ────────────────────────────────
// These functions evaluate upstream module data and return alerts
// that should be created. Used in demo mode with static data,
// and in live mode with Supabase queries.

interface TriggerInput {
  correctiveActions: {
    id: string; status: string; severity: string; dueDate: string;
    category: string; title: string; locationId: string; locationName: string;
  }[];
  certifications: {
    id: string; name: string; expires: string | null; employeeName: string;
    locationId: string; locationName: string;
  }[];
  equipment: {
    id: string; name: string; nextServiceDate: string; type: string;
    locationId: string; locationName: string;
  }[];
  incidents: {
    id: string; severity: string; status: string; type: string;
    regulatoryReportRequired?: boolean; regulatoryReportFiledAt?: string;
    createdAt: string; locationId: string; locationName: string;
  }[];
  signals: {
    id: string; severity: string; status: string; createdAt: string;
    affectedPillars: string[];
  }[];
}

export function evaluateTriggers(input: TriggerInput): Omit<ReScoreAlert, 'id'>[] {
  const alerts: Omit<ReScoreAlert, 'id'>[] = [];
  const now = Date.now();

  // Corrective action overdue
  for (const ca of input.correctiveActions) {
    if (['completed', 'verified', 'closed', 'archived'].includes(ca.status)) continue;
    const due = new Date(ca.dueDate).getTime();
    if (due < now) {
      const isCriticalOverdue = ca.severity === 'critical' &&
        (now - due > 48 * 3600000);
      alerts.push({
        facilityId: ca.locationId,
        facilityName: ca.locationName,
        pillar: ca.category === 'facility_safety' ? 'fire' : 'food',
        triggerSource: 'Corrective Actions',
        triggerRecordType: 'corrective_action',
        triggerRecordId: ca.id,
        severity: isCriticalOverdue ? 'critical' : 'high',
        message: isCriticalOverdue
          ? `Critical corrective action "${ca.title}" overdue by more than 48 hours`
          : `Corrective action "${ca.title}" is overdue — compliance score may be affected`,
        status: 'active',
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
        createdAt: new Date(due).toISOString(),
      });
    }
  }

  // Certification expired or expiring within 7 days
  for (const cert of input.certifications) {
    if (!cert.expires) continue;
    const expires = new Date(cert.expires).getTime();
    const daysLeft = Math.ceil((expires - now) / 86400000);
    if (daysLeft < 0) {
      alerts.push({
        facilityId: cert.locationId,
        facilityName: cert.locationName,
        pillar: 'food',
        triggerSource: 'Training & Certifications',
        triggerRecordType: 'certification',
        triggerRecordId: cert.id,
        severity: 'high',
        message: `${cert.employeeName}'s "${cert.name}" has expired — food safety compliance affected`,
        status: 'active',
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
        createdAt: new Date(expires).toISOString(),
      });
    } else if (daysLeft <= 7) {
      alerts.push({
        facilityId: cert.locationId,
        facilityName: cert.locationName,
        pillar: 'food',
        triggerSource: 'Training & Certifications',
        triggerRecordType: 'certification',
        triggerRecordId: cert.id,
        severity: 'medium',
        message: `${cert.employeeName}'s "${cert.name}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — renew to maintain compliance`,
        status: 'active',
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Equipment maintenance overdue
  for (const eq of input.equipment) {
    const due = new Date(eq.nextServiceDate).getTime();
    if (due < now) {
      const isHood = eq.type.toLowerCase().includes('hood') || eq.type.toLowerCase().includes('suppression');
      alerts.push({
        facilityId: eq.locationId,
        facilityName: eq.locationName,
        pillar: isHood ? 'fire' : 'both',
        triggerSource: 'Equipment Maintenance',
        triggerRecordType: 'equipment',
        triggerRecordId: eq.id,
        severity: isHood ? 'critical' : 'high',
        message: isHood
          ? `${eq.name} maintenance overdue — NFPA 96 compliance at risk`
          : `${eq.name} maintenance is overdue — schedule service to maintain compliance`,
        status: 'active',
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
        createdAt: new Date(due).toISOString(),
      });
    }
  }

  // Critical incidents filed
  for (const inc of input.incidents) {
    if (['resolved', 'verified'].includes(inc.status) || inc.severity !== 'critical') continue;
    alerts.push({
      facilityId: inc.locationId,
      facilityName: inc.locationName,
      pillar: inc.type === 'equipment_failure' ? 'fire' : 'food',
      triggerSource: 'Incident Log',
      triggerRecordType: 'incident',
      triggerRecordId: inc.id,
      severity: 'critical',
      message: `Critical incident open — compliance posture may be degraded`,
      status: 'active',
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
      createdAt: inc.createdAt,
    });

    // Regulatory report required but not filed within 24hrs
    if (inc.regulatoryReportRequired && !inc.regulatoryReportFiledAt) {
      const created = new Date(inc.createdAt).getTime();
      if (now - created > 24 * 3600000) {
        alerts.push({
          facilityId: inc.locationId,
          facilityName: inc.locationName,
          pillar: 'both',
          triggerSource: 'Incident Log',
          triggerRecordType: 'incident',
          triggerRecordId: inc.id,
          severity: 'critical',
          message: `Regulatory report required but not filed within 24 hours — immediate action needed`,
          status: 'active',
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          createdAt: new Date(created + 24 * 3600000).toISOString(),
        });
      }
    }
  }

  // Unacknowledged critical signals for 48+ hours
  for (const sig of input.signals) {
    if (sig.status !== 'new' || sig.severity !== 'critical') continue;
    const created = new Date(sig.createdAt).getTime();
    if (now - created > 48 * 3600000) {
      const pillars = sig.affectedPillars;
      const pillar: AlertPillar = pillars.includes('food_safety') && pillars.includes('facility_safety')
        ? 'both'
        : pillars.includes('facility_safety') ? 'fire' : 'food';
      alerts.push({
        facilityId: 'all',
        facilityName: 'All Locations',
        pillar,
        triggerSource: 'Intelligence Signals',
        triggerRecordType: 'signal',
        triggerRecordId: sig.id,
        severity: 'high',
        message: `Critical intelligence signal unacknowledged for 48+ hours — review required`,
        status: 'active',
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
        createdAt: new Date(created + 48 * 3600000).toISOString(),
      });
    }
  }

  return alerts;
}

// ── Pre-Built Demo Alerts ────────────────────────────────────
// Realistic scenarios based on upstream demo data

export const DEMO_RESCORE_ALERTS: ReScoreAlert[] = [
  // Location 1 — critical: overdue corrective action (from CorrectiveActions demo)
  {
    id: 'rsa-001',
    facilityId: '1',
    facilityName: 'Location 1',
    pillar: 'food',
    triggerSource: 'Corrective Actions',
    triggerRecordType: 'corrective_action',
    triggerRecordId: 'ca-001',
    severity: 'critical',
    message: 'Critical corrective action "Walk-in cooler temperature out of range" overdue by more than 48 hours',
    status: 'active',
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    createdAt: hoursAgo(52),
  },
  // Location 2 — high: expired certification
  {
    id: 'rsa-002',
    facilityId: '2',
    facilityName: 'Location 2',
    pillar: 'food',
    triggerSource: 'Training & Certifications',
    triggerRecordType: 'certification',
    triggerRecordId: 'tc-exp-1',
    severity: 'high',
    message: 'Michael Torres\'s "California Food Handler Card" has expired — food safety compliance affected',
    status: 'active',
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    createdAt: daysAgo(6),
  },
  // Location 2 — critical: hood system overdue (NFPA 96)
  {
    id: 'rsa-003',
    facilityId: '2',
    facilityName: 'Location 2',
    pillar: 'fire',
    triggerSource: 'Equipment Maintenance',
    triggerRecordType: 'equipment',
    triggerRecordId: 'EQ-009',
    severity: 'critical',
    message: 'Hood Ventilation System maintenance overdue — NFPA 96 compliance at risk',
    status: 'active',
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    createdAt: daysAgo(3),
  },
  // Location 1 — critical: pest sighting incident
  {
    id: 'rsa-004',
    facilityId: '2',
    facilityName: 'Location 2',
    pillar: 'food',
    triggerSource: 'Incident Log',
    triggerRecordType: 'incident',
    triggerRecordId: 'INC-005',
    severity: 'critical',
    message: 'Critical incident open — compliance posture may be degraded',
    status: 'active',
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    createdAt: hoursAgo(8),
  },
  // Location 3 — high: equipment maintenance overdue
  {
    id: 'rsa-005',
    facilityId: '3',
    facilityName: 'Location 3',
    pillar: 'both',
    triggerSource: 'Equipment Maintenance',
    triggerRecordType: 'equipment',
    triggerRecordId: 'EQ-013',
    severity: 'high',
    message: 'Walk-in Cooler maintenance is overdue — schedule service to maintain compliance',
    status: 'active',
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    createdAt: daysAgo(2),
  },
  // Location 1 — medium: cert expiring within 7 days
  {
    id: 'rsa-006',
    facilityId: '1',
    facilityName: 'Location 1',
    pillar: 'food',
    triggerSource: 'Training & Certifications',
    triggerRecordType: 'certification',
    triggerRecordId: 'tc-7',
    severity: 'medium',
    message: 'Sarah Chen\'s "ServSafe Food Protection Manager" expires in 5 days — renew to maintain compliance',
    status: 'active',
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    createdAt: hoursAgo(12),
  },
  // Resolved alert for demo completeness
  {
    id: 'rsa-007',
    facilityId: '1',
    facilityName: 'Location 1',
    pillar: 'food',
    triggerSource: 'Corrective Actions',
    triggerRecordType: 'corrective_action',
    triggerRecordId: 'ca-003',
    severity: 'high',
    message: 'Corrective action "Floor drain clogged" was resolved — compliance posture improved',
    status: 'resolved',
    acknowledgedAt: daysAgo(4),
    acknowledgedBy: 'Sarah Chen',
    resolvedAt: daysAgo(3),
    createdAt: daysAgo(5),
  },
];

// ── Helper Functions ─────────────────────────────────────────

export function getActiveAlerts(alerts: ReScoreAlert[]): ReScoreAlert[] {
  return alerts.filter(a => a.status === 'active');
}

export function getAlertsByFacility(alerts: ReScoreAlert[], facilityId: string): ReScoreAlert[] {
  return alerts.filter(a => a.facilityId === facilityId || a.facilityId === 'all');
}

export function getAlertCountBySeverity(alerts: ReScoreAlert[]): { critical: number; high: number; medium: number } {
  const active = getActiveAlerts(alerts);
  return {
    critical: active.filter(a => a.severity === 'critical').length,
    high: active.filter(a => a.severity === 'high').length,
    medium: active.filter(a => a.severity === 'medium').length,
  };
}

export function getPillarLabel(pillar: AlertPillar): string {
  switch (pillar) {
    case 'food': return 'Food Safety';
    case 'fire': return 'Facility Safety';
    case 'both': return 'Food & Facility Safety';
  }
}

export function getSeverityColor(severity: AlertSeverity): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'critical': return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    case 'high': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    case 'medium': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
  }
}
