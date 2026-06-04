/**
 * DashboardLocationContext — C18 Phase 3
 *
 * Manages location selection for the dashboard.
 * All mode (null) = org-wide aggregate. Single location = filter by location_id.
 * Single-location orgs: isMultiLocation = false, switcher never renders.
 * Selection persisted in sessionStorage.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface DashboardLocation {
  id: string;
  name: string;
  created_at: string;
}

interface DashboardLocationContextValue {
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string | null) => void;
  locations: DashboardLocation[];
  locationCount: number;
  isMultiLocation: boolean;
  loading: boolean;
}

const DashboardLocationCtx = createContext<DashboardLocationContextValue>({
  selectedLocationId: null,
  setSelectedLocationId: () => {},
  locations: [],
  locationCount: 0,
  isMultiLocation: false,
  loading: true,
});

export function useDashboardLocation() {
  return useContext(DashboardLocationCtx);
}

const SESSION_KEY = 'evidly_dashboard_location';

export function DashboardLocationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [locations, setLocations] = useState<DashboardLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedIdRaw] = useState<string | null>(() => {
    try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
  });

  const setSelectedLocationId = (id: string | null) => {
    setSelectedIdRaw(id);
    try {
      if (id) sessionStorage.setItem(SESSION_KEY, id);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* sessionStorage unavailable */ }
  };

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('locations')
        .select('id, name, created_at')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('name');

      if (cancelled) return;
      const locs = (data || []) as DashboardLocation[];
      setLocations(locs);

      // Reset stale selection
      const savedId = selectedId;
      if (savedId && !locs.find(l => l.id === savedId)) {
        setSelectedLocationId(null);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMultiLocation = locations.length > 1;

  return (
    <DashboardLocationCtx.Provider value={{
      selectedLocationId: isMultiLocation ? selectedId : null,
      setSelectedLocationId,
      locations,
      locationCount: locations.length,
      isMultiLocation,
      loading,
    }}>
      {children}
    </DashboardLocationCtx.Provider>
  );
}
