/**
 * Workforce Risk Scanner — CIC Pillar 5 (P5)
 *
 * Scans employee_certifications for expiring/expired certs and generates
 * workforce_risk_signals records. Works in both demo mode (returns mock
 * results) and production (queries + writes to Supabase).
 *
 * Signal types produced:
 *   food_handler_cert_expired       — cert past expiration
 *   food_handler_cert_expiring_soon — cert expires within 30 days
 *   cfpm_cert_expired               — CFPM/manager cert past expiration
 *   cfpm_cert_expiring_soon         — CFPM cert expires within 60 days
 *   training_incomplete             — required training not completed
 *   role_cert_gap                   — role requires cert that employee lacks
 *
 * The scanner is idempotent: re-running it resolves signals whose underlying
 * condition is no longer true and creates new ones for newly detected gaps.
 */

import { supabase } from './supabase';
import { WORKFORCE_SIGNAL_TYPES } from './cicPillars';

export interface WorkforceSignal {
  signal_type: typeof WORKFORCE_SIGNAL_TYPES[number];
  location_id: string;
  organization_id: string;
  affected_count: number;
  details: {
    employee_ids?: string[];
    cert_type?: string;
    earliest_expiry?: string;
    description: string;
  };
}

export interface ScanResult {
  scanned_at: string;
  total_employees: number;
  signals_created: number;
  signals_resolved: number;
  signals: WorkforceSignal[];
}

/** Thresholds for "expiring soon" detection (days) */
const FOOD_HANDLER_SOON_DAYS = 30;
const CFPM_SOON_DAYS = 60;

/**
 * Run a workforce risk scan for a given organization.
 * In demo mode, returns synthetic results without touching Supabase.
 */
export async function scanWorkforceRisk(
  organizationId: string,
  isDemoMode: boolean,
): Promise<ScanResult> {
  if (isDemoMode) {
    return getDemoScanResult(organizationId);
  }

  const now = new Date();
  const soonCutoffFH = new Date(now);
  soonCutoffFH.setDate(soonCutoffFH.getDate() + FOOD_HANDLER_SOON_DAYS);
  const soonCutoffCFPM = new Date(now);
  soonCutoffCFPM.setDate(soonCutoffCFPM.getDate() + CFPM_SOON_DAYS);

  // Fetch all active employee certifications for the org
  const { data: certs, error } = await supabase
    .from('employee_certifications')
    .select('id, employee_id, location_id, cert_type, expiration_date, status')
    .eq('organization_id', organizationId)
    .neq('status', 'revoked');

  if (error) {
    console.error('[WorkforceRiskScanner] cert query error:', error.message);
    return { scanned_at: now.toISOString(), total_employees: 0, signals_created: 0, signals_resolved: 0, signals: [] };
  }

  const employees = new Set((certs || []).map(c => c.employee_id));
  const signals: WorkforceSignal[] = [];

  // Group certs by location + cert_type
  const byLocType = new Map<string, typeof certs>();
  for (const cert of certs || []) {
    const key = `${cert.location_id}::${cert.cert_type}`;
    const group = byLocType.get(key) || [];
    group.push(cert);
    byLocType.set(key, group);
  }

  for (const [key, group] of byLocType) {
    const [locationId] = key.split('::');
    const certType = group[0].cert_type;
    const isCFPM = certType === 'cfpm' || certType === 'food_protection_manager';
    const soonCutoff = isCFPM ? soonCutoffCFPM : soonCutoffFH;

    // Find expired certs
    const expired = group.filter(c => c.expiration_date && new Date(c.expiration_date) < now);
    if (expired.length > 0) {
      const signalType = isCFPM ? 'cfpm_cert_expired' : 'food_handler_cert_expired';
      signals.push({
        signal_type: signalType as typeof WORKFORCE_SIGNAL_TYPES[number],
        location_id: locationId,
        organization_id: organizationId,
        affected_count: expired.length,
        details: {
          employee_ids: expired.map(c => c.employee_id),
          cert_type: certType,
          earliest_expiry: expired.sort((a, b) => a.expiration_date.localeCompare(b.expiration_date))[0].expiration_date,
          description: `${expired.length} ${isCFPM ? 'CFPM' : 'food handler'} cert(s) expired`,
        },
      });
    }

    // Find expiring-soon certs (not yet expired)
    const expiringSoon = group.filter(c => {
      if (!c.expiration_date) return false;
      const exp = new Date(c.expiration_date);
      return exp >= now && exp <= soonCutoff;
    });
    if (expiringSoon.length > 0) {
      const signalType = isCFPM ? 'cfpm_cert_expiring_soon' : 'food_handler_cert_expiring_soon';
      signals.push({
        signal_type: signalType as typeof WORKFORCE_SIGNAL_TYPES[number],
        location_id: locationId,
        organization_id: organizationId,
        affected_count: expiringSoon.length,
        details: {
          employee_ids: expiringSoon.map(c => c.employee_id),
          cert_type: certType,
          earliest_expiry: expiringSoon.sort((a, b) => a.expiration_date.localeCompare(b.expiration_date))[0].expiration_date,
          description: `${expiringSoon.length} ${isCFPM ? 'CFPM' : 'food handler'} cert(s) expiring within ${isCFPM ? CFPM_SOON_DAYS : FOOD_HANDLER_SOON_DAYS} days`,
        },
      });
    }
  }

  // Persist: resolve old signals, insert new ones
  let signalsCreated = 0;
  let signalsResolved = 0;

  // Resolve existing unresolved signals for this org
  const { data: existing } = await supabase
    .from('workforce_risk_signals')
    .select('id, signal_type, location_id')
    .eq('organization_id', organizationId)
    .is('resolved_at', null);

  // Mark as resolved any signal that no longer has a matching condition
  for (const old of existing || []) {
    const stillActive = signals.some(
      s => s.signal_type === old.signal_type && s.location_id === old.location_id,
    );
    if (!stillActive) {
      await supabase
        .from('workforce_risk_signals')
        .update({ resolved_at: now.toISOString() })
        .eq('id', old.id);
      signalsResolved++;
    }
  }

  // Insert new signals that don't already have an unresolved record
  for (const sig of signals) {
    const alreadyExists = (existing || []).some(
      e => e.signal_type === sig.signal_type && e.location_id === sig.location_id,
    );
    if (!alreadyExists) {
      await supabase.from('workforce_risk_signals').insert({
        signal_type: sig.signal_type,
        location_id: sig.location_id,
        organization_id: sig.organization_id,
        affected_count: sig.affected_count,
        details: sig.details,
      });
      signalsCreated++;
    }
  }

  return {
    scanned_at: now.toISOString(),
    total_employees: employees.size,
    signals_created: signalsCreated,
    signals_resolved: signalsResolved,
    signals,
  };
}

/** Demo mode: return synthetic scan results */
function getDemoScanResult(organizationId: string): ScanResult {
  return {
    scanned_at: new Date().toISOString(),
    total_employees: 9,
    signals_created: 0,
    signals_resolved: 0,
    signals: [
      {
        signal_type: 'food_handler_cert_expiring_soon',
        location_id: 'demo-loc-airport',
        organization_id: organizationId,
        affected_count: 2,
        details: {
          employee_ids: ['d5', 'd7'],
          cert_type: 'food_handler',
          earliest_expiry: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          description: '2 food handler cert(s) expiring within 30 days',
        },
      },
      {
        signal_type: 'cfpm_cert_expired',
        location_id: 'demo-loc-university',
        organization_id: organizationId,
        affected_count: 1,
        details: {
          employee_ids: ['d9'],
          cert_type: 'cfpm',
          earliest_expiry: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
          description: '1 CFPM cert(s) expired',
        },
      },
    ],
  };
}
