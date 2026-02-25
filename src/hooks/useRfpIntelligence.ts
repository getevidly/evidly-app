/**
 * RFP-INTEL-1 — RFP Intelligence Monitor data hook
 *
 * Demo mode: returns static data from rfpDemoData.ts with client-side filtering.
 * Live mode: queries rfp_listings JOIN rfp_classifications via Supabase.
 * Admin-only — used exclusively by /admin/rfp-intelligence.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { getDemoRfpListings, getDemoRfpStats, getDemoRfpSources } from '../data/rfpDemoData';
import type {
  RfpSource,
  RfpListingWithDetails,
  RfpDashboardStats,
  RfpFilterState,
  RfpRelevanceTier,
  RfpActionType,
} from '../types/rfp';
import { EMPTY_FILTERS } from '../types/rfp';

export type RfpViewMode = 'cards' | 'table';
export type RfpTab = 'feed' | 'analytics' | 'sources' | 'cost';

interface UseRfpIntelligenceReturn {
  listings: RfpListingWithDetails[];
  filteredListings: RfpListingWithDetails[];
  stats: RfpDashboardStats;
  sources: RfpSource[];
  filters: RfpFilterState;
  setFilters: React.Dispatch<React.SetStateAction<RfpFilterState>>;
  resetFilters: () => void;
  viewMode: RfpViewMode;
  setViewMode: (mode: RfpViewMode) => void;
  activeTab: RfpTab;
  setActiveTab: (tab: RfpTab) => void;
  selectedRfpId: string | null;
  setSelectedRfpId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  handleAction: (rfpId: string, action: RfpActionType, notes?: string) => void;
  runCrawl: () => void;
  runClassify: () => void;
}

// ── Helpers ─────────────────────────────────────────────

function matchesSearch(item: RfpListingWithDetails, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(lower) ||
    (item.description ?? '').toLowerCase().includes(lower) ||
    item.issuing_entity.toLowerCase().includes(lower) ||
    (item.classification?.ai_reasoning ?? '').toLowerCase().includes(lower) ||
    (item.classification?.matched_keywords ?? []).some(k => k.toLowerCase().includes(lower))
  );
}

function applyFilters(
  items: RfpListingWithDetails[],
  f: RfpFilterState,
): RfpListingWithDetails[] {
  let result = items;

  if (f.search.trim()) {
    result = result.filter(item => matchesSearch(item, f.search));
  }

  if (f.relevance_tier.length > 0) {
    result = result.filter(item =>
      item.classification && f.relevance_tier.includes(item.classification.relevance_tier),
    );
  }

  if (f.source_type.length > 0) {
    result = result.filter(item =>
      item.source && f.source_type.includes(item.source.source_type),
    );
  }

  if (f.state.length > 0) {
    result = result.filter(item => item.state && f.state.includes(item.state));
  }

  if (f.entity_type.length > 0) {
    result = result.filter(item => f.entity_type.includes(item.entity_type));
  }

  if (f.matched_module.length > 0) {
    result = result.filter(item =>
      item.classification &&
      item.classification.matched_modules.some(m => f.matched_module.includes(m)),
    );
  }

  if (f.naics_code.trim()) {
    result = result.filter(item =>
      item.naics_code && item.naics_code.includes(f.naics_code.trim()),
    );
  }

  if (f.set_aside_type.length > 0) {
    result = result.filter(item =>
      item.set_aside_type && f.set_aside_type.includes(item.set_aside_type),
    );
  }

  if (f.status.length > 0) {
    result = result.filter(item => f.status.includes(item.status));
  }

  if (f.date_from) {
    const from = new Date(f.date_from).getTime();
    result = result.filter(item => item.due_date && new Date(item.due_date).getTime() >= from);
  }

  if (f.date_to) {
    const to = new Date(f.date_to).getTime();
    result = result.filter(item => item.due_date && new Date(item.due_date).getTime() <= to);
  }

  return result;
}

function sortByRelevance(items: RfpListingWithDetails[]): RfpListingWithDetails[] {
  return [...items].sort((a, b) => {
    const scoreA = a.classification?.relevance_score ?? 0;
    const scoreB = b.classification?.relevance_score ?? 0;
    return scoreB - scoreA;
  });
}

function computeStats(
  listings: RfpListingWithDetails[],
  demoStats?: RfpDashboardStats,
): RfpDashboardStats {
  if (demoStats) return demoStats;

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  let highRelevance = 0;
  let pursuing = 0;
  let dueThisWeek = 0;
  let wonCount = 0;
  let lostCount = 0;
  let veteranSetAsides = 0;
  let tokensMonth = 0;
  let costMonth = 0;
  let classifiedMonth = 0;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  for (const item of listings) {
    if (item.classification?.relevance_tier === 'high') highRelevance++;
    if (item.set_aside_type === 'veteran' || item.set_aside_type === 'sdvosb') veteranSetAsides++;
    if (item.due_date) {
      const dueMs = new Date(item.due_date).getTime();
      if (dueMs >= now && dueMs <= now + weekMs) dueThisWeek++;
    }

    const lastAction = item.actions?.[0];
    if (lastAction?.action === 'pursuing') pursuing++;
    if (lastAction?.action === 'won') wonCount++;
    if (lastAction?.action === 'lost') lostCount++;

    if (item.classification) {
      const classAt = new Date(item.classification.classified_at).getTime();
      if (classAt >= monthStart.getTime()) {
        classifiedMonth++;
        tokensMonth += item.classification.tokens_used;
        costMonth += item.classification.classification_cost;
      }
    }
  }

  return {
    total_active: listings.filter(l => l.status === 'open').length,
    high_relevance: highRelevance,
    pursuing,
    due_this_week: dueThisWeek,
    won_count: wonCount,
    lost_count: lostCount,
    veteran_set_asides: veteranSetAsides,
    classifications_this_month: classifiedMonth,
    tokens_this_month: tokensMonth,
    estimated_cost_this_month: Math.round(costMonth * 100) / 100,
    budget_remaining: Math.round((100 - costMonth) * 100) / 100,
  };
}

// ── Hook ────────────────────────────────────────────────

export function useRfpIntelligence(): UseRfpIntelligenceReturn {
  const { isDemoMode } = useDemo();

  const [listings, setListings] = useState<RfpListingWithDetails[]>([]);
  const [sources, setSources] = useState<RfpSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RfpFilterState>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<RfpViewMode>('cards');
  const [activeTab, setActiveTab] = useState<RfpTab>('feed');
  const [selectedRfpId, setSelectedRfpId] = useState<string | null>(null);

  // ── Load data ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isDemoMode) {
          const demoListings = getDemoRfpListings();
          const demoSources = getDemoRfpSources();
          if (!cancelled) {
            setListings(demoListings);
            setSources(demoSources);
          }
        } else {
          // Live mode: query Supabase
          const { data: listingRows, error: listingErr } = await supabase
            .from('rfp_listings')
            .select(`
              *,
              rfp_classifications (*),
              rfp_sources!rfp_listings_source_id_fkey (*),
              rfp_actions (*)
            `)
            .order('created_at', { ascending: false })
            .limit(200);

          if (listingErr) throw listingErr;

          const mapped: RfpListingWithDetails[] = (listingRows ?? []).map((row: any) => ({
            ...row,
            classification: Array.isArray(row.rfp_classifications)
              ? row.rfp_classifications[0] ?? null
              : row.rfp_classifications ?? null,
            source: Array.isArray(row.rfp_sources)
              ? row.rfp_sources[0] ?? null
              : row.rfp_sources ?? null,
            actions: Array.isArray(row.rfp_actions) ? row.rfp_actions : [],
          }));

          const { data: sourceRows } = await supabase
            .from('rfp_sources')
            .select('*')
            .order('name');

          if (!cancelled) {
            setListings(mapped);
            setSources(sourceRows ?? []);
          }
        }
      } catch (err: any) {
        console.error('[RFP Intelligence] Load error:', err);
        if (!cancelled) {
          setError(err.message ?? 'Failed to load RFP data');
          // Fallback to demo data
          setListings(getDemoRfpListings());
          setSources(getDemoRfpSources());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  // ── Filtered + sorted listings ──────────────────────
  const filteredListings = useMemo(() => {
    const filtered = applyFilters(listings, filters);
    return sortByRelevance(filtered);
  }, [listings, filters]);

  // ── Stats ───────────────────────────────────────────
  const stats = useMemo<RfpDashboardStats>(() => {
    if (isDemoMode) return getDemoRfpStats();
    return computeStats(listings);
  }, [listings, isDemoMode]);

  // ── Actions ─────────────────────────────────────────
  const handleAction = useCallback(
    (rfpId: string, action: RfpActionType, notes?: string) => {
      if (isDemoMode) {
        // Demo: update local state
        setListings(prev =>
          prev.map(item => {
            if (item.id !== rfpId) return item;
            const newAction = {
              id: `act-demo-${Date.now()}`,
              rfp_id: rfpId,
              action,
              notes: notes ?? null,
              assigned_to: null,
              deadline: null,
              created_by: 'demo-admin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return { ...item, actions: [newAction, ...item.actions] };
          }),
        );
        toast.success(`RFP marked as "${action}"`);
        return;
      }

      // Live: insert action + update listing status
      (async () => {
        try {
          const { error: insertErr } = await supabase
            .from('rfp_actions')
            .insert({ rfp_id: rfpId, action, notes: notes ?? null, created_by: 'admin' });
          if (insertErr) throw insertErr;

          // Map action to listing status
          const statusMap: Record<string, string> = {
            pursuing: 'open',
            watching: 'open',
            declined: 'closed',
            won: 'awarded',
            lost: 'closed',
          };
          const newStatus = statusMap[action];
          if (newStatus) {
            await supabase.from('rfp_listings').update({ status: newStatus }).eq('id', rfpId);
          }

          toast.success(`RFP marked as "${action}"`);
        } catch (err: any) {
          console.error('[RFP Intelligence] Action error:', err);
          toast.error('Failed to save action');
        }
      })();
    },
    [isDemoMode],
  );

  // ── Manual triggers ─────────────────────────────────
  const runCrawl = useCallback(() => {
    if (isDemoMode) {
      toast.success('Crawl simulated in demo mode — 3 new RFPs discovered');
      return;
    }
    supabase.functions
      .invoke('rfp-crawl', { body: { manual: true } })
      .then(({ error: err }) => {
        if (err) throw err;
        toast.success('Crawl started — results will appear shortly');
      })
      .catch((err: any) => {
        console.error('[RFP Intelligence] Crawl error:', err);
        toast.error('Failed to start crawl');
      });
  }, [isDemoMode]);

  const runClassify = useCallback(() => {
    if (isDemoMode) {
      toast.success('Classification simulated in demo mode — 5 RFPs classified');
      return;
    }
    supabase.functions
      .invoke('rfp-classify', { body: { manual: true } })
      .then(({ error: err }) => {
        if (err) throw err;
        toast.success('Classification started — results will appear shortly');
      })
      .catch((err: any) => {
        console.error('[RFP Intelligence] Classify error:', err);
        toast.error('Failed to start classification');
      });
  }, [isDemoMode]);

  // ── Reset filters ───────────────────────────────────
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return {
    listings,
    filteredListings,
    stats,
    sources,
    filters,
    setFilters,
    resetFilters,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    selectedRfpId,
    setSelectedRfpId,
    loading,
    error,
    handleAction,
    runCrawl,
    runClassify,
  };
}
