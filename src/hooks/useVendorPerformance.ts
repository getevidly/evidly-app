/**
 * useVendorPerformance — aggregates vendor performance metrics.
 * Queries vendors, vendor_service_records, service_requests, vendor_documents.
 * Client-side aggregation per vendor within the operator's org.
 * No realtime — refetch on mount only.
 * Demo mode returns empty array.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

export interface VendorPerformanceRow {
  id: string;
  name: string;
  initials: string;
  services: string[];
  kpi: {
    onTime: string;
    response: string;
    docsStatus: string;
    trend: 'up' | 'down' | 'flat';
  };
}

interface UseVendorPerformanceResult {
  vendors: VendorPerformanceRow[];
  loading: boolean;
  error: string | null;
}

export function useVendorPerformance(): UseVendorPerformanceResult {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [vendors, setVendors] = useState<VendorPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchPerformance = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setVendors([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parallel queries
      const [vendorsRes, recordsRes, requestsRes, docsRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, company_name')
          .eq('organization_id', orgId),
        supabase
          .from('vendor_service_records')
          .select('id, vendor_id, vendor_name, service_date, next_due_date, service_type_code')
          .eq('organization_id', orgId)
          .eq('is_sample', false)
          .order('service_date', { ascending: false }),
        supabase
          .from('service_requests')
          .select('vendor_id, status, created_at, confirmed_datetime')
          .eq('organization_id', orgId),
        supabase
          .from('vendor_documents')
          .select('vendor_id, status')
          .eq('organization_id', orgId),
      ]);

      if (vendorsRes.error) {
        setError(vendorsRes.error.message);
        setVendors([]);
        return;
      }

      const vendorList = vendorsRes.data || [];
      const records = recordsRes.data || [];
      const requests = requestsRes.data || [];
      const docs = docsRes.data || [];

      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

      const rows: VendorPerformanceRow[] = [];

      for (const v of vendorList) {
        const vId = v.id as string;
        const vName = v.company_name as string;

        // Service records for this vendor
        const vRecords = records.filter(
          (r: Record<string, unknown>) => r.vendor_id === vId || r.vendor_name === vName
        );

        // Must have ≥3 records to qualify
        if (vRecords.length < 3) continue;

        // Unique service types
        const serviceTypes = [...new Set(
          vRecords
            .map((r: Record<string, unknown>) => r.service_type_code as string)
            .filter(Boolean)
        )];

        // On-time rate: records where service_date ≤ next_due_date (when both exist)
        const withDates = vRecords.filter(
          (r: Record<string, unknown>) => r.service_date && r.next_due_date
        );
        let onTimePct = '—';
        if (withDates.length >= 3) {
          const onTimeCount = withDates.filter((r: Record<string, unknown>) => {
            const sd = new Date(r.service_date as string);
            const dd = new Date(r.next_due_date as string);
            return sd <= dd;
          }).length;
          onTimePct = `${Math.round((onTimeCount / withDates.length) * 100)}%`;
        }

        // Response time from service_requests
        const vRequests = requests.filter(
          (r: Record<string, unknown>) => r.vendor_id === vId
        );
        const confirmed = vRequests.filter(
          (r: Record<string, unknown>) => r.confirmed_datetime && r.created_at
        );
        let responseStr = '—';
        if (confirmed.length > 0) {
          const totalDays = confirmed.reduce((sum: number, r: Record<string, unknown>) => {
            const created = new Date(r.created_at as string).getTime();
            const conf = new Date(r.confirmed_datetime as string).getTime();
            return sum + Math.max(0, (conf - created) / (1000 * 60 * 60 * 24));
          }, 0);
          const avgDays = totalDays / confirmed.length;
          responseStr = `${avgDays.toFixed(1)}d`;
        }

        // Docs status
        const vDocs = docs.filter((d: Record<string, unknown>) => d.vendor_id === vId);
        const acceptedDocs = vDocs.filter((d: Record<string, unknown>) => d.status === 'accepted').length;
        const docsStatus = vDocs.length > 0 ? `${acceptedDocs} of ${vDocs.length}` : '—';

        // Trend: compare recent 3-month on-time vs prior 3-month on-time
        let trend: 'up' | 'down' | 'flat' = 'flat';
        if (withDates.length >= 6) {
          const recentRecords = withDates.filter((r: Record<string, unknown>) => {
            const sd = new Date(r.service_date as string);
            return sd >= threeMonthsAgo;
          });
          const priorRecords = withDates.filter((r: Record<string, unknown>) => {
            const sd = new Date(r.service_date as string);
            return sd >= sixMonthsAgo && sd < threeMonthsAgo;
          });

          if (recentRecords.length >= 2 && priorRecords.length >= 2) {
            const recentOnTime = recentRecords.filter((r: Record<string, unknown>) => {
              const sd = new Date(r.service_date as string);
              const dd = new Date(r.next_due_date as string);
              return sd <= dd;
            }).length / recentRecords.length;

            const priorOnTime = priorRecords.filter((r: Record<string, unknown>) => {
              const sd = new Date(r.service_date as string);
              const dd = new Date(r.next_due_date as string);
              return sd <= dd;
            }).length / priorRecords.length;

            if (recentOnTime > priorOnTime + 0.05) trend = 'up';
            else if (recentOnTime < priorOnTime - 0.05) trend = 'down';
          }
        }

        // Initials
        const words = vName.trim().split(/\s+/);
        const initials = words.length >= 2
          ? (words[0][0] + words[1][0]).toUpperCase()
          : vName.slice(0, 2).toUpperCase();

        rows.push({
          id: vId,
          name: vName,
          initials,
          services: serviceTypes,
          kpi: {
            onTime: onTimePct,
            response: responseStr,
            docsStatus,
            trend,
          },
        });
      }

      // Sort by on-time rate descending (vendors with % first, then —)
      rows.sort((a, b) => {
        const aVal = a.kpi.onTime.endsWith('%') ? parseFloat(a.kpi.onTime) : -1;
        const bVal = b.kpi.onTime.endsWith('%') ? parseFloat(b.kpi.onTime) : -1;
        return bVal - aVal;
      });

      setVendors(rows);
    } catch {
      setError('Failed to fetch vendor performance');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, isDemoMode]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return { vendors, loading, error };
}
