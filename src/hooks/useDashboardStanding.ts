/**
 * useDashboardStanding — Master hook for dashboard standing data
 *
 * Orchestrates all standing queries and derives:
 * - Per-location operational standing (ok/action/pending/unknown)
 * - Banner status + headline (dynamic, never hardcoded)
 * - Today's tasks, upcoming events, attention items
 * - Vendor summary, inspection readiness
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import {
  fetchAllStandingData,
  type LocationStanding,
  type TaskItem,
  type UpcomingEvent,
  type AttentionItem,
  type ReadinessSignal,
  type VendorSummaryData,
} from '../lib/standingQueries';

// Re-export types for consumers
export type { LocationStanding, TaskItem, UpcomingEvent, AttentionItem, ReadinessSignal, VendorSummaryData };
export type { StandingLevel } from '../lib/standingQueries';

export type BannerStatus = 'covered' | 'attention' | 'risk';

export interface DashboardStanding {
  locations: LocationStanding[];
  bannerStatus: BannerStatus;
  bannerHeadline: string;
  todaysTasks: TaskItem[];
  upcomingEvents: UpcomingEvent[];
  attentionItems: AttentionItem[];
  vendorSummary: VendorSummaryData | null;
  inspectionReadiness: ReadinessSignal[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function deriveBannerStatus(standings: LocationStanding[]): BannerStatus {
  if (standings.length === 0) return 'attention';

  const hasAction = standings.some(s => s.foodSafety === 'action' || s.facilitySafety === 'action');
  const hasCritical = standings.some(s => s.criticalItemCount > 0);
  const totalOpen = standings.reduce((sum, s) => sum + s.openItemCount, 0);

  if (hasAction && hasCritical) return 'risk';
  if (hasAction || totalOpen > 0 || standings.some(s => s.foodSafety === 'pending' || s.facilitySafety === 'pending')) {
    return 'attention';
  }
  return 'covered';
}

function deriveBannerHeadline(standings: LocationStanding[], status: BannerStatus): string {
  if (standings.length === 0) return 'Add your first location to get started.';

  if (status === 'covered') {
    return 'All locations covered. Nothing requires attention.';
  }

  if (status === 'risk') {
    // Find the most critical location
    const critical = standings
      .filter(s => s.criticalItemCount > 0)
      .sort((a, b) => b.criticalItemCount - a.criticalItemCount)[0];
    if (critical) {
      const reason = critical.foodSafetyReason || critical.facilitySafetyReason || 'Critical items require attention';
      return `${critical.locationName}: ${reason}`;
    }
    const actionLocs = standings.filter(s => s.foodSafety === 'action' || s.facilitySafety === 'action');
    return `${actionLocs.length} of ${standings.length} locations need attention.`;
  }

  // attention
  const needsAttention = standings.filter(
    s => s.foodSafety !== 'ok' || s.facilitySafety !== 'ok' || s.openItemCount > 0
  );
  if (needsAttention.length === 0) {
    const totalOpen = standings.reduce((sum, s) => sum + s.openItemCount, 0);
    return `${totalOpen} open item${totalOpen !== 1 ? 's' : ''} across your locations.`;
  }
  return `${needsAttention.length} of ${standings.length} location${standings.length !== 1 ? 's' : ''} need attention.`;
}

export function useDashboardStanding(
  role?: string,
  userId?: string | null,
  locationId?: string | null,
): DashboardStanding {
  const { profile } = useAuth();
  const { isAnyDemoMode } = useDemo();
  const orgId = profile?.organization_id || null;

  const [standings, setStandings] = useState<LocationStanding[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [readiness, setReadiness] = useState<ReadinessSignal[]>([]);
  const [vendorSummary, setVendorSummary] = useState<VendorSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllStandingData(
        orgId,
        isAnyDemoMode,
        role,
        userId ?? undefined,
        locationId ?? undefined,
      );
      setStandings(result.standings);
      setTasks(result.tasks);
      setEvents(result.events);
      setAttention(result.attention);
      setReadiness(result.readiness);
      setVendorSummary(result.vendorSummary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [orgId, isAnyDemoMode, role, userId, locationId]);

  useEffect(() => {
    load();
  }, [load]);

  const bannerStatus = useMemo(() => deriveBannerStatus(standings), [standings]);
  const bannerHeadline = useMemo(() => deriveBannerHeadline(standings, bannerStatus), [standings, bannerStatus]);

  return {
    locations: standings,
    bannerStatus,
    bannerHeadline,
    todaysTasks: tasks,
    upcomingEvents: events,
    attentionItems: attention,
    vendorSummary,
    inspectionReadiness: readiness,
    loading,
    error,
    refresh: load,
  };
}
