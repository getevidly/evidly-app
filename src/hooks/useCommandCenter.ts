/**
 * COMMAND-CENTER-1 — Intelligence Command Center data hook
 *
 * Demo mode: returns static data from commandCenterDemoData.ts with client-side filtering.
 * Live mode: queries main app Supabase tables.
 * Admin-only — used exclusively by /admin/intelligence.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  getDemoSignals,
  getDemoGamePlans,
  getDemoPlatformUpdates,
  getDemoNotifications,
  getDemoCrawlLog,
  getDemoSourceHealth,
  getDemoCommandCenterStats,
} from '../data/commandCenterDemoData';
import type {
  Signal,
  GamePlan,
  PlatformUpdate,
  ClientNotification,
  CrawlExecution,
  CrawlSourceHealth,
  CommandCenterStats,
  CommandCenterTab,
  SignalFilterState,
  SignalReviewAction,
} from '../types/commandCenter';
import { EMPTY_SIGNAL_FILTERS } from '../types/commandCenter';

// ── Return type ──────────────────────────────────────────────

export interface UseCommandCenterReturn {
  // Data
  signals: Signal[];
  filteredSignals: Signal[];
  gamePlans: GamePlan[];
  platformUpdates: PlatformUpdate[];
  notifications: ClientNotification[];
  crawlLog: CrawlExecution[];
  sourceHealth: CrawlSourceHealth[];
  stats: CommandCenterStats;

  // UI state
  activeTab: CommandCenterTab;
  setActiveTab: (tab: CommandCenterTab) => void;
  selectedSignalId: string | null;
  setSelectedSignalId: (id: string | null) => void;
  filters: SignalFilterState;
  setFilters: React.Dispatch<React.SetStateAction<SignalFilterState>>;
  resetFilters: () => void;
  loading: boolean;
  error: string | null;

  // Signal actions
  reviewSignal: (id: string, action: SignalReviewAction, notes?: string, deferUntil?: string) => void;

  // Game plan actions
  updateTaskStatus: (planId: string, taskId: string, status: string) => void;

  // Platform update actions
  applyUpdate: (id: string) => void;
  rollbackUpdate: (id: string) => void;

  // Notification actions
  approveNotification: (id: string) => void;
  sendNotification: (id: string) => void;
  cancelNotification: (id: string) => void;

  // Refresh
  refresh: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

function matchesSearch(signal: Signal, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    signal.title.toLowerCase().includes(lower) ||
    signal.summary.toLowerCase().includes(lower) ||
    (signal.jurisdiction ?? '').toLowerCase().includes(lower) ||
    signal.event_type.toLowerCase().includes(lower)
  );
}

function applySignalFilters(items: Signal[], f: SignalFilterState): Signal[] {
  let result = items;

  if (f.search.trim()) {
    result = result.filter(item => matchesSearch(item, f.search));
  }
  if (f.severity.length > 0) {
    result = result.filter(item => f.severity.includes(item.severity));
  }
  if (f.source_type.length > 0) {
    result = result.filter(item => f.source_type.includes(item.source_type));
  }
  if (f.status.length > 0) {
    result = result.filter(item => f.status.includes(item.status));
  }

  return result;
}

function computeStats(
  signals: Signal[],
  gamePlans: GamePlan[],
  platformUpdates: PlatformUpdate[],
  notifications: ClientNotification[],
  crawlLog: CrawlExecution[],
  sourceHealth: CrawlSourceHealth[],
): CommandCenterStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const successCount = crawlLog.filter(c => c.status === 'success').length;

  return {
    pending_signals: signals.filter(s => s.status === 'new').length,
    active_game_plans: gamePlans.filter(p => p.status === 'active').length,
    pending_updates: platformUpdates.filter(u => u.status === 'pending').length,
    unsent_notifications: notifications.filter(n => n.status === 'draft' || n.status === 'approved').length,
    signals_today: signals.filter(s => new Date(s.created_at).getTime() >= today.getTime()).length,
    signals_this_week: signals.filter(s => new Date(s.created_at).getTime() >= weekAgo.getTime()).length,
    crawl_success_rate: crawlLog.length > 0 ? Math.round((successCount / crawlLog.length) * 100) : 100,
    sources_healthy: sourceHealth.filter(s => s.status === 'healthy').length,
    sources_total: sourceHealth.length,
  };
}

// ── Hook ─────────────────────────────────────────────────────

export function useCommandCenter(): UseCommandCenterReturn {
  const { isDemoMode } = useDemo();

  const [signals, setSignals] = useState<Signal[]>([]);
  const [gamePlans, setGamePlans] = useState<GamePlan[]>([]);
  const [platformUpdates, setPlatformUpdates] = useState<PlatformUpdate[]>([]);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [crawlLog, setCrawlLog] = useState<CrawlExecution[]>([]);
  const [sourceHealth, setSourceHealth] = useState<CrawlSourceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<CommandCenterTab>('signals');
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [filters, setFilters] = useState<SignalFilterState>(EMPTY_SIGNAL_FILTERS);

  // ── Load data ──────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        setSignals(getDemoSignals());
        setGamePlans(getDemoGamePlans());
        setPlatformUpdates(getDemoPlatformUpdates());
        setNotifications(getDemoNotifications());
        setCrawlLog(getDemoCrawlLog());
        setSourceHealth(getDemoSourceHealth());
      } else {
        // Live mode: query Supabase tables
        const [sigRes, gpRes, puRes, cnRes, clRes] = await Promise.all([
          supabase.from('intelligence_signals').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('intelligence_game_plans').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('platform_updates').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('client_notifications').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('crawl_execution_log').select('*').order('started_at', { ascending: false }).limit(100),
        ]);

        if (sigRes.error) throw sigRes.error;
        if (gpRes.error) throw gpRes.error;
        if (puRes.error) throw puRes.error;
        if (cnRes.error) throw cnRes.error;
        if (clRes.error) throw clRes.error;

        setSignals(sigRes.data ?? []);
        setGamePlans(gpRes.data ?? []);
        setPlatformUpdates(puRes.data ?? []);
        setNotifications(cnRes.data ?? []);
        setCrawlLog(clRes.data ?? []);
        // Source health would need aggregation — for now derive from crawl log
        setSourceHealth([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load command center data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filtered signals ───────────────────────────────────────

  const filteredSignals = useMemo(
    () => applySignalFilters(signals, filters),
    [signals, filters],
  );

  // ── Stats ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (isDemoMode) return getDemoCommandCenterStats();
    return computeStats(signals, gamePlans, platformUpdates, notifications, crawlLog, sourceHealth);
  }, [isDemoMode, signals, gamePlans, platformUpdates, notifications, crawlLog, sourceHealth]);

  // ── Signal actions ─────────────────────────────────────────

  const reviewSignal = useCallback((id: string, action: SignalReviewAction, notes?: string, deferUntil?: string) => {
    const statusMap: Record<SignalReviewAction, string> = {
      approve: 'approved',
      dismiss: 'dismissed',
      defer: 'deferred',
      escalate: 'escalated',
    };

    if (isDemoMode) {
      setSignals(prev => prev.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          status: statusMap[action] as Signal['status'],
          reviewed_by: 'arthur@getevidly.com',
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
          deferred_until: action === 'defer' ? (deferUntil || null) : s.deferred_until,
          escalated_at: action === 'escalate' ? new Date().toISOString() : s.escalated_at,
        };
      }));
      toast.success(`Signal ${action}d successfully`);
    } else {
      const updates: Record<string, unknown> = {
        status: statusMap[action],
        reviewed_by: 'admin',
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      };
      if (action === 'defer') updates.deferred_until = deferUntil;
      if (action === 'escalate') updates.escalated_at = new Date().toISOString();

      supabase.from('intelligence_signals').update(updates).eq('id', id).then(({ error: err }) => {
        if (err) {
          toast.error(`Failed to ${action} signal`);
        } else {
          toast.success(`Signal ${action}d successfully`);
          loadData();
        }
      });
    }
  }, [isDemoMode, loadData]);

  // ── Game plan actions ──────────────────────────────────────

  const updateTaskStatus = useCallback((planId: string, taskId: string, newStatus: string) => {
    if (isDemoMode) {
      setGamePlans(prev => prev.map(p => {
        if (p.id !== planId) return p;
        const updatedTasks = p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            status: newStatus as typeof t.status,
            completed_at: newStatus === 'completed' ? new Date().toISOString() : t.completed_at,
          };
        });
        const completed = updatedTasks.filter(t => t.status === 'completed').length;
        const inProgress = updatedTasks.filter(t => t.status === 'in_progress').length;
        return {
          ...p,
          tasks: updatedTasks,
          task_status: { total: updatedTasks.length, completed, in_progress: inProgress },
          status: completed === updatedTasks.length ? 'completed' as const : p.status,
        };
      }));
      toast.success('Task updated');
    } else {
      // Live: update the JSONB tasks array
      const plan = gamePlans.find(p => p.id === planId);
      if (!plan) return;
      const updatedTasks = plan.tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : t.completed_at } : t,
      );
      const completed = updatedTasks.filter(t => t.status === 'completed').length;
      const inProgress = updatedTasks.filter(t => t.status === 'in_progress').length;

      supabase.from('intelligence_game_plans').update({
        tasks: updatedTasks,
        task_status: { total: updatedTasks.length, completed, in_progress: inProgress },
      }).eq('id', planId).then(({ error: err }) => {
        if (err) toast.error('Failed to update task');
        else { toast.success('Task updated'); loadData(); }
      });
    }
  }, [isDemoMode, gamePlans, loadData]);

  // ── Platform update actions ────────────────────────────────

  const applyUpdate = useCallback((id: string) => {
    if (isDemoMode) {
      setPlatformUpdates(prev => prev.map(u =>
        u.id === id ? { ...u, status: 'applied' as const, applied_by: 'arthur@getevidly.com', applied_at: new Date().toISOString() } : u,
      ));
      toast.success('Platform update applied');
    } else {
      supabase.from('platform_updates').update({
        status: 'applied',
        applied_by: 'admin',
        applied_at: new Date().toISOString(),
      }).eq('id', id).then(({ error: err }) => {
        if (err) toast.error('Failed to apply update');
        else { toast.success('Platform update applied'); loadData(); }
      });
    }
  }, [isDemoMode, loadData]);

  const rollbackUpdate = useCallback((id: string) => {
    if (isDemoMode) {
      setPlatformUpdates(prev => prev.map(u =>
        u.id === id ? { ...u, status: 'rolled_back' as const, rolled_back_by: 'arthur@getevidly.com', rolled_back_at: new Date().toISOString() } : u,
      ));
      toast.success('Platform update rolled back');
    } else {
      supabase.from('platform_updates').update({
        status: 'rolled_back',
        rolled_back_by: 'admin',
        rolled_back_at: new Date().toISOString(),
      }).eq('id', id).then(({ error: err }) => {
        if (err) toast.error('Failed to rollback update');
        else { toast.success('Platform update rolled back'); loadData(); }
      });
    }
  }, [isDemoMode, loadData]);

  // ── Notification actions ───────────────────────────────────

  const approveNotification = useCallback((id: string) => {
    if (isDemoMode) {
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, status: 'approved' as const, approved_by: 'arthur@getevidly.com', approved_at: new Date().toISOString() } : n,
      ));
      toast.success('Notification approved');
    } else {
      supabase.from('client_notifications').update({
        status: 'approved',
        approved_by: 'admin',
        approved_at: new Date().toISOString(),
      }).eq('id', id).then(({ error: err }) => {
        if (err) toast.error('Failed to approve notification');
        else { toast.success('Notification approved'); loadData(); }
      });
    }
  }, [isDemoMode, loadData]);

  const sendNotification = useCallback((id: string) => {
    if (isDemoMode) {
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, status: 'sent' as const, sent_at: new Date().toISOString(), sent_count: 42 } : n,
      ));
      toast.success('Notification sent to 42 clients');
    } else {
      supabase.from('client_notifications').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', id).then(({ error: err }) => {
        if (err) toast.error('Failed to send notification');
        else { toast.success('Notification sent'); loadData(); }
      });
    }
  }, [isDemoMode, loadData]);

  const cancelNotification = useCallback((id: string) => {
    if (isDemoMode) {
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, status: 'cancelled' as const } : n,
      ));
      toast.success('Notification cancelled');
    } else {
      supabase.from('client_notifications').update({ status: 'cancelled' }).eq('id', id).then(({ error: err }) => {
        if (err) toast.error('Failed to cancel notification');
        else { toast.success('Notification cancelled'); loadData(); }
      });
    }
  }, [isDemoMode, loadData]);

  // ── Return ─────────────────────────────────────────────────

  return {
    signals,
    filteredSignals,
    gamePlans,
    platformUpdates,
    notifications,
    crawlLog,
    sourceHealth,
    stats,
    activeTab,
    setActiveTab,
    selectedSignalId,
    setSelectedSignalId,
    filters,
    setFilters,
    resetFilters: () => setFilters(EMPTY_SIGNAL_FILTERS),
    loading,
    error,
    reviewSignal,
    updateTaskStatus,
    applyUpdate,
    rollbackUpdate,
    approveNotification,
    sendNotification,
    cancelNotification,
    refresh: loadData,
  };
}
