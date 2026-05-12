import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../contexts/RoleContext';

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface UseTeamRolesReturn {
  members: TeamMember[];
  invites: PendingInvite[];
  filledRoles: Set<string>;
  missingRoles: string[];
  loading: boolean;
}

/**
 * Returns current team members + pending invites for the org.
 * Exposes which roles are filled and which are missing,
 * used by delegation suggestion logic.
 */
export function useTeamRoles(): UseTeamRolesReturn {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);

      // Fetch active members
      const { data: memberData } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role')
        .eq('organization_id', orgId)
        .neq('role', 'platform_admin');

      if (cancelled) return;

      // Fetch pending invitations
      const { data: inviteData } = await supabase
        .from('user_invitations')
        .select('id, email, role, status, created_at')
        .eq('organization_id', orgId)
        .in('status', ['pending', 'sent']);

      if (cancelled) return;

      setMembers((memberData || []) as TeamMember[]);
      setInvites((inviteData || []) as PendingInvite[]);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId]);

  // Roles filled by either active members or pending invites
  const filledRoles = new Set<string>([
    ...members.map(m => m.role),
    ...invites.map(i => i.role),
  ]);

  // Key operational roles that should be filled for a complete team
  const KEY_ROLES = ['compliance_manager', 'facilities_manager', 'kitchen_manager', 'chef'];
  const missingRoles = KEY_ROLES.filter(r => !filledRoles.has(r));

  return { members, invites, filledRoles, missingRoles, loading };
}
