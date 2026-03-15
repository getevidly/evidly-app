/**
 * usePSESchedules — Fetch PSE safeguard status from location_service_schedules
 *
 * Queries KEC and FS service schedules, maps to PSESafeguard interface.
 * Fire alarm and sprinklers are always included as 'unverified' (no service codes).
 * Demo mode returns SAMPLE_PSE_SAFEGUARDS.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';
import {
  SERVICE_TYPES,
  SERVICE_CODE_TO_SAFEGUARD,
  getServiceStatus,
  formatFrequency,
  type ServiceTypeCode,
  type ServiceFrequency,
} from '../constants/serviceTypes';
import { SAMPLE_PSE_SAFEGUARDS, type PSESafeguard } from '../data/workforceRiskDemoData';

interface ScheduleRow {
  service_type_code: string;
  vendor_name: string | null;
  frequency: string | null;
  last_service_date: string | null;
  next_due_date: string | null;
}

/** Map ServiceStatus → PSESafeguard status terminology */
function mapStatus(serviceStatus: string): PSESafeguard['status'] {
  switch (serviceStatus) {
    case 'current': return 'current';
    case 'due_soon': return 'expiring';
    case 'overdue': return 'overdue';
    default: return 'unverified';
  }
}

/** Pick the worst status from a list of schedule rows for the same service code */
function worstStatus(rows: ScheduleRow[]): PSESafeguard['status'] {
  const statuses = rows.map(r => mapStatus(getServiceStatus(r.next_due_date)));
  if (statuses.includes('overdue')) return 'overdue';
  if (statuses.includes('expiring')) return 'expiring';
  if (statuses.includes('current')) return 'current';
  return 'unverified';
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function usePSESchedules(
  organizationId: string | undefined,
  locationId?: string,
) {
  const { isDemoMode } = useDemo();
  const [safeguards, setSafeguards] = useState<PSESafeguard[]>(
    isDemoMode ? SAMPLE_PSE_SAFEGUARDS : [],
  );
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (isDemoMode || !organizationId) return;
    setIsLoading(true);
    setError(null);

    let query = supabase
      .from('location_service_schedules')
      .select('service_type_code, vendor_name, frequency, last_service_date, next_due_date')
      .eq('organization_id', organizationId)
      .in('service_type_code', ['KEC', 'FS'])
      .eq('is_active', true);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: rows, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      setIsLoading(false);
      return;
    }

    // Group rows by service_type_code
    const byCode = new Map<string, ScheduleRow[]>();
    for (const row of (rows || [])) {
      const existing = byCode.get(row.service_type_code) || [];
      existing.push(row);
      byCode.set(row.service_type_code, existing);
    }

    const result: PSESafeguard[] = [];

    // KEC → Hood Cleaning
    const kecRows = byCode.get('KEC') || [];
    if (kecRows.length > 0) {
      const best = kecRows[0]; // Use first row for vendor/dates, worst status across all
      result.push({
        label: SERVICE_TYPES.KEC.name,
        standard: SERVICE_TYPES.KEC.nfpaCitation,
        authority: 'AHJ (Fire)',
        vendor: best.vendor_name,
        cert: null,
        lastService: formatDate(best.last_service_date),
        nextDue: formatDate(best.next_due_date),
        interval: best.frequency ? formatFrequency(best.frequency as ServiceFrequency) : 'Per NFPA 96 Table 12.4',
        status: worstStatus(kecRows),
      });
    } else {
      result.push({
        label: SERVICE_TYPES.KEC.name,
        standard: SERVICE_TYPES.KEC.nfpaCitation,
        authority: 'AHJ (Fire)',
        vendor: null,
        cert: null,
        lastService: null,
        nextDue: null,
        interval: 'Per NFPA 96 Table 12.4',
        status: 'unverified',
      });
    }

    // FS → Fire Suppression
    const fsRows = byCode.get('FS') || [];
    if (fsRows.length > 0) {
      const best = fsRows[0];
      result.push({
        label: SERVICE_TYPES.FS.name,
        standard: SERVICE_TYPES.FS.nfpaCitation,
        authority: 'AHJ (Fire)',
        vendor: best.vendor_name,
        cert: null,
        lastService: formatDate(best.last_service_date),
        nextDue: formatDate(best.next_due_date),
        interval: best.frequency ? formatFrequency(best.frequency as ServiceFrequency) : 'Semi-Annual',
        status: worstStatus(fsRows),
      });
    } else {
      result.push({
        label: SERVICE_TYPES.FS.name,
        standard: SERVICE_TYPES.FS.nfpaCitation,
        authority: 'AHJ (Fire)',
        vendor: null,
        cert: null,
        lastService: null,
        nextDue: null,
        interval: 'Semi-Annual',
        status: 'unverified',
      });
    }

    // Fire Alarm & Sprinklers — no service codes, always unverified via this hook
    result.push({
      label: 'Fire Alarm & Detection',
      standard: 'NFPA 72 · Annual',
      authority: 'AHJ (Fire)',
      vendor: null,
      cert: null,
      lastService: null,
      nextDue: null,
      interval: 'Annual',
      status: 'unverified',
    });

    result.push({
      label: 'Sprinkler System',
      standard: 'NFPA 25 · Annual',
      authority: 'AHJ (Fire)',
      vendor: null,
      cert: null,
      lastService: null,
      nextDue: null,
      interval: 'Annual',
      status: 'unverified',
    });

    setSafeguards(result);
    setIsLoading(false);
  }, [isDemoMode, organizationId, locationId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { safeguards, isLoading, error };
}
