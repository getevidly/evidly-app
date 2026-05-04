/**
 * useOrgMembers.ts
 *
 * Fetches org members (user_location_access rows joined to profiles)
 * for the current org. Used by assignment + escalation pickers across
 * TaskDefinitionForm, IncidentLog, and other surfaces that target a
 * specific person rather than a role.
 *
 * Demo mode → empty array.
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

  const fetchMembers = useCallback(async () => {
    if (isDemoMode || !orgId) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_location_access')
        .select('user_id, role, user_profiles:user_id(full_name, email)')
        .eq('organization_id', orgId);

      if (error) {
        console.warn('[useOrgMembers] Fetch error:', error.message);
        setMembers([]);
        return;
      }

      // Dedupe by user_id (a user may have multiple location rows)
      const seen = new Set<string>();
      const result: OrgMember[] = [];
      for (const row of (data ?? []) as Array<{
        user_id: string;
        role: string | null;
        user_profiles: { full_name: string | null; email: string | null } | null;
      }>) {
        if (seen.has(row.user_id)) continue;
        seen.add(row.user_id);
        result.push({
          id: row.user_id,
          full_name: row.user_profiles?.full_name ?? null,
          email: row.user_profiles?.email ?? null,
          role: row.role,
        });
      }

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
