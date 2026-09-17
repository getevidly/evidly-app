/**
 * ScopedOrgContext — admin cross-org record viewing
 *
 * The record pages (fire-safety, documents) query .eq('organization_id', orgId).
 * That orgId was always profile.organization_id, so an admin could only ever see
 * their own org's records. This makes the value selectable for platform_admin
 * and leaves it pinned to the profile org for everyone else.
 *
 * Non-admins: scopedOrgId === profile.organization_id, always. No selection is
 * possible and the picker never renders — RLS would reject a cross-org read
 * anyway, but the UI should not offer what it cannot deliver.
 *
 * Selection persisted in sessionStorage, mirroring DashboardLocationContext.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface ScopedOrg {
  id: string;
  name: string;
}

interface ScopedOrgContextValue {
  /** The org the record pages should query. Own org unless an admin picked another. */
  scopedOrgId: string | undefined;
  setScopedOrgId: (id: string | null) => void;
  /** Selectable orgs — populated for platform_admin only. */
  orgs: ScopedOrg[];
  isPlatformAdmin: boolean;
  /** True when an admin is looking at an org other than their own. */
  isScoped: boolean;
  loading: boolean;
}

const ScopedOrgCtx = createContext<ScopedOrgContextValue>({
  scopedOrgId: undefined,
  setScopedOrgId: () => {},
  orgs: [],
  isPlatformAdmin: false,
  isScoped: false,
  loading: true,
});

/** The org id the current page should query. Own org for non-admins. */
export function useScopedOrg(): string | undefined {
  return useContext(ScopedOrgCtx).scopedOrgId;
}

/** Full context — for the picker, which needs the org list and the setter. */
export function useScopedOrgContext(): ScopedOrgContextValue {
  return useContext(ScopedOrgCtx);
}

const SESSION_KEY = 'evidly_scoped_org';

export function ScopedOrgProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const ownOrgId = profile?.organization_id;
  const isPlatformAdmin = profile?.role === 'platform_admin';

  const [orgs, setOrgs] = useState<ScopedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedIdRaw] = useState<string | null>(() => {
    try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
  });

  const setScopedOrgId = (id: string | null) => {
    setSelectedIdRaw(id);
    try {
      if (id) sessionStorage.setItem(SESSION_KEY, id);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* sessionStorage unavailable */ }
  };

  useEffect(() => {
    if (!isPlatformAdmin) { setOrgs([]); setLoading(false); return; }
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('is_system', false)
        .order('name');

      if (cancelled) return;
      const rows = (data || []) as ScopedOrg[];
      setOrgs(rows);

      // Drop a selection pointing at an org that no longer resolves.
      if (selectedId && !rows.find(o => o.id === selectedId)) {
        setScopedOrgId(null);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [isPlatformAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // A non-admin can never be scoped elsewhere, whatever sessionStorage holds.
  const effectiveId = isPlatformAdmin ? (selectedId || ownOrgId) : ownOrgId;

  return (
    <ScopedOrgCtx.Provider value={{
      scopedOrgId: effectiveId,
      setScopedOrgId,
      orgs,
      isPlatformAdmin,
      isScoped: Boolean(isPlatformAdmin && selectedId && selectedId !== ownOrgId),
      loading,
    }}>
      {children}
    </ScopedOrgCtx.Provider>
  );
}
