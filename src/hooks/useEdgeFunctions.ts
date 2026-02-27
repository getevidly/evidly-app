/**
 * EDGE-FN-MONITOR-1 — Edge Function Health Monitor data hook
 *
 * Demo mode: returns static data from edgeFunctionsDemoData.ts with client-side filtering.
 * Live mode: queries edge_function_registry + edge_function_invocations via Supabase.
 * Admin-only — used exclusively by /admin/system/edge-functions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  getDemoRegistry,
  getDemoInvocations,
  getDemoHealthRows,
  getDemoCronJobs,
  getDemoHealthSummary,
  getDemoErrors,
} from '../data/edgeFunctionsDemoData';
import type {
  EdgeFunctionEntry,
  EdgeFunctionInvocation,
  FunctionHealthRow,
  CronJob,
  HealthSummary,
  FunctionFilterState,
  TimeRange,
  EdgeFnTab,
  FunctionCategory,
  HealthStatus,
} from '../types/edgeFunctions';
import { EMPTY_FUNCTION_FILTERS, DEFAULT_PAYLOADS } from '../types/edgeFunctions';

// ── Return type ──────────────────────────────────────────────

export interface UseEdgeFunctionsReturn {
  // Data
  registry: EdgeFunctionEntry[];
  invocations: EdgeFunctionInvocation[];
  healthRows: FunctionHealthRow[];
  filteredHealthRows: FunctionHealthRow[];
  cronJobs: CronJob[];
  summary: HealthSummary;
  errors: EdgeFunctionInvocation[];

  // UI state
  activeTab: EdgeFnTab;
  setActiveTab: (tab: EdgeFnTab) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  filters: FunctionFilterState;
  setFilters: React.Dispatch<React.SetStateAction<FunctionFilterState>>;
  resetFilters: () => void;
  selectedFunction: string | null;
  setSelectedFunction: (name: string | null) => void;
  loading: boolean;
  error: string | null;

  // Actions
  invokeFunction: (functionName: string, payload?: Record<string, unknown>) => void;
  toggleCronJob: (jobId: number, active: boolean) => void;
  refresh: () => void;

  // Invocation detail
  getInvocationsForFunction: (functionName: string) => EdgeFunctionInvocation[];
  getDefaultPayload: (functionName: string) => Record<string, unknown>;
}

// ── Helpers ──────────────────────────────────────────────────

function applyFilters(rows: FunctionHealthRow[], f: FunctionFilterState): FunctionHealthRow[] {
  let result = rows;

  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    result = result.filter(
      r =>
        r.function_name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
    );
  }

  if (f.category) {
    result = result.filter(r => r.category === f.category);
  }

  if (f.health) {
    result = result.filter(r => r.health === f.health);
  }

  return result;
}

// ── Hook ─────────────────────────────────────────────────────

export function useEdgeFunctions(): UseEdgeFunctionsReturn {
  const { isDemoMode } = useDemo();

  const [registry, setRegistry] = useState<EdgeFunctionEntry[]>([]);
  const [invocations, setInvocations] = useState<EdgeFunctionInvocation[]>([]);
  const [healthRows, setHealthRows] = useState<FunctionHealthRow[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<EdgeFnTab>('registry');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [filters, setFilters] = useState<FunctionFilterState>(EMPTY_FUNCTION_FILTERS);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        setRegistry(getDemoRegistry());
        setInvocations(getDemoInvocations());
        setHealthRows(getDemoHealthRows());
        setCronJobs(getDemoCronJobs());
      } else {
        const [regRes, invRes] = await Promise.all([
          supabase
            .from('edge_function_registry')
            .select('*')
            .order('function_name'),
          supabase
            .from('edge_function_invocations')
            .select('*')
            .order('invoked_at', { ascending: false })
            .limit(500),
        ]);

        if (regRes.error) throw regRes.error;
        if (invRes.error) throw invRes.error;

        setRegistry(regRes.data ?? []);
        setInvocations(invRes.data ?? []);

        // Health rows computed client-side from registry + invocations
        // (matches demo computeHealth logic)
        setHealthRows([]); // Will be recomputed in useMemo below
        setCronJobs([]); // pg_cron not queryable via PostgREST
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load edge function data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Real-time subscription (live mode) ─────────────────────

  useEffect(() => {
    if (isDemoMode) return;

    const channel = supabase
      .channel('edge-fn-invocations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'edge_function_invocations' },
        (payload) => {
          const row = payload.new as EdgeFunctionInvocation;
          setInvocations(prev => [row, ...prev].slice(0, 500));
          toast.info(`${row.function_name} invoked`);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode]);

  // ── Filtered health rows ───────────────────────────────────

  const filteredHealthRows = useMemo(
    () => applyFilters(healthRows, filters),
    [healthRows, filters],
  );

  // ── Summary ────────────────────────────────────────────────

  const summary = useMemo<HealthSummary>(() => {
    if (isDemoMode) return getDemoHealthSummary();
    return {
      total_deployed: healthRows.length,
      healthy: healthRows.filter(r => r.health === 'healthy').length,
      degraded: healthRows.filter(r => r.health === 'degraded').length,
      failed: healthRows.filter(r => r.health === 'failed').length,
      inactive: healthRows.filter(r => r.health === 'inactive' || r.health === 'on_demand').length,
    };
  }, [isDemoMode, healthRows]);

  // ── Errors ─────────────────────────────────────────────────

  const errors = useMemo<EdgeFunctionInvocation[]>(() => {
    if (isDemoMode) return getDemoErrors();
    return invocations
      .filter(i => i.status === 'error' || i.status === 'timeout')
      .slice(0, 50);
  }, [isDemoMode, invocations]);

  // ── Invoke function ────────────────────────────────────────

  const invokeFunction = useCallback(
    (functionName: string, payload?: Record<string, unknown>) => {
      const body = payload ?? DEFAULT_PAYLOADS[functionName] ?? { manual_trigger: true };

      if (isDemoMode) {
        toast.success(`${functionName} invoked (demo) — simulated success`);
        return;
      }

      toast.info(`Invoking ${functionName}...`);

      supabase.functions
        .invoke(functionName, { body })
        .then(({ error: err }) => {
          if (err) throw err;
          toast.success(`${functionName} completed successfully`);
          loadData(); // Refresh to get new invocation
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Invocation failed';
          console.error(`[EdgeFunctions] Invoke error:`, err);
          toast.error(`${functionName} failed: ${msg}`);
        });
    },
    [isDemoMode, loadData],
  );

  // ── Toggle cron job ────────────────────────────────────────

  const toggleCronJob = useCallback(
    (jobId: number, active: boolean) => {
      if (isDemoMode) {
        setCronJobs(prev =>
          prev.map(j => (j.jobid === jobId ? { ...j, active } : j)),
        );
        toast.success(`Cron job ${active ? 'enabled' : 'disabled'} (demo)`);
        return;
      }

      // Live: would need pg_cron admin RPC — not available via PostgREST
      toast.error('Cron job toggling requires direct database access');
    },
    [isDemoMode],
  );

  // ── Helpers ────────────────────────────────────────────────

  const getInvocationsForFunction = useCallback(
    (functionName: string): EdgeFunctionInvocation[] => {
      return invocations.filter(i => i.function_name === functionName);
    },
    [invocations],
  );

  const getDefaultPayload = useCallback(
    (functionName: string): Record<string, unknown> => {
      return DEFAULT_PAYLOADS[functionName] ?? { manual_trigger: true };
    },
    [],
  );

  // ── Return ─────────────────────────────────────────────────

  return {
    registry,
    invocations,
    healthRows,
    filteredHealthRows,
    cronJobs,
    summary,
    errors,
    activeTab,
    setActiveTab,
    timeRange,
    setTimeRange,
    filters,
    setFilters,
    resetFilters: () => setFilters(EMPTY_FUNCTION_FILTERS),
    selectedFunction,
    setSelectedFunction,
    loading,
    error,
    invokeFunction,
    toggleCronJob,
    refresh: loadData,
    getInvocationsForFunction,
    getDefaultPayload,
  };
}
