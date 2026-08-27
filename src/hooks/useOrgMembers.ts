/**
 * useOrgMembers.ts
 *
 * Fetches org members for the current org. Used by assignment + escalation
 * pickers across TaskDefinitionForm, IncidentLog, CorrectiveActions and other
 * surfaces that target a specific person rather than a role.
 *
 * Reads user_profiles directly, org-scoped — the pattern useRolePermissions,
 * useTeamGrid and useTeamRoles already use. It previously read
 * user_location_access with a user_profiles embed, which could not work:
 *
 *   1. RLS. The ULA SELECT policy is USING (auth.uid() = user_id) — "Users can
 *      view their own access", 20260204500000, never widened. The org filter
 *      was irrelevant; a viewer could only ever see their own row, so the
 *      picker could never list the team.
 *   2. The embed. user_location_access.user_id REFERENCES auth.users(id) and
 *      there is no FK from ULA to user_profiles, so PostgREST could not resolve
 *      user_profiles:user_id(...) and returned PGRST200.
 *
 * user_profiles has an org-wide SELECT policy ("Users can view profiles in
 * their organization", 20260205003451), so the direct read is the one that
 * actually returns the team.
 *
 * Failures are reported through `error` rather than collapsing to an empty
 * list: callers must be able to tell "no members" from "lookup failed".
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';

export interface OrgMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

export function useOrgMembers() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  /** Why the list is empty, when it is empty for a reason other than "none". */
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    // Both guards used to empty the list silently, which is indistinguishable
    // from an org with no team. Say which one fired.
    if (isDemoMode) {
      setMembers([]);
      setError('Demo mode — org members are not loaded.');
      return;
    }
    if (!orgId) {
      setMembers([]);
      setError('No organization on your profile.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryErr } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role')
        .eq('organization_id', orgId);

      if (queryErr) {
        console.error('[useOrgMembers] user_profiles fetch failed:', queryErr);
        setMembers([]);
        setError(queryErr.message);
        return;
      }

      const result: OrgMember[] = (data ?? []).map(row => {
        const r = row as { id: string; full_name: string | null; email: string | null; role: string | null };
        return {
          id: r.id,
          full_name: r.full_name ?? null,
          email: r.email ?? null,
          role: r.role,
        };
      });

      // Sort alphabetically by display name
      result.sort((a, b) => {
        const nameA = (a.full_name || a.email || '').toLowerCase();
        const nameB = (b.full_name || b.email || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setMembers(result);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, orgId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
  };
}

/**
 * Helper: resolve a user_id to a display name from a member list.
 * Falls back to "Unknown" if not found.
 */
export function getMemberName(members: OrgMember[], userId: string | null | undefined): string {
  if (!userId) return 'Unassigned';
  const m = members.find((x) => x.id === userId);
  if (!m) return 'Unknown';
  return m.full_name || m.email || 'Unknown';
}
