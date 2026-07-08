/**
 * PortfolioDataContext — shared multi-location posture provider
 *
 * Calls usePortfolioData once at the Dashboard level and shares the
 * result via context.  Dashboard components (LocationHeatMap,
 * PortfolioSnapshot, LocationSwitcher) read posture from here instead
 * of computing their own standing independently.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { usePortfolioData, type PortfolioLocation, type PortfolioSummary, type PostureStatus } from '../hooks/usePortfolioData';

interface PortfolioDataContextValue {
  locations: PortfolioLocation[];
  summary: PortfolioSummary;
  loading: boolean;
  error: Error | null;
}

const Ctx = createContext<PortfolioDataContextValue | null>(null);

export function PortfolioDataProvider({ children }: { children: ReactNode }) {
  const { locations, summary, loading, error } = usePortfolioData();
  return (
    <Ctx.Provider value={{ locations, summary, loading, error }}>
      {children}
    </Ctx.Provider>
  );
}

/**
 * Read shared portfolio data.  Returns safe defaults when rendered
 * outside the provider (graceful fallback — loading stays true).
 */
export function usePortfolioDataContext(): PortfolioDataContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      locations: [],
      summary: {
        totalLocations: 0,
        foodAlarm: 0, foodWatch: 0, foodSolid: 0,
        fireAlarm: 0, fireWatch: 0, fireSolid: 0,
        totalOpenItems: 0, totalHandled: 0, totalAtRiskCents: 0,
        atRiskLow: 0, atRiskHigh: 0, benchmarkPlaceholder: true,
      },
      loading: true,
      error: null,
    };
  }
  return ctx;
}

/* ── Posture helpers ────────────────────────────────────────── */

const POSTURE_RANK: Record<string, number> = { alarm: 3, watch: 2, solid: 1 };

/** Return the worse of two posture values. */
export function worstPosture(food: PostureStatus, fire: PostureStatus): PostureStatus {
  return (POSTURE_RANK[food] || 0) >= (POSTURE_RANK[fire] || 0) ? food : fire;
}

export type HealthState = 'coral' | 'teal' | 'green';

/** Map canonical posture → dashboard health color. */
export function postureToHealth(posture: PostureStatus): HealthState {
  if (posture === 'alarm') return 'coral';
  if (posture === 'watch') return 'teal';
  return 'green';
}
