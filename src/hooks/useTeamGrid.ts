/**
 * useTeamGrid — C13b
 *
 * Fetches team members and their task completion stats for the current week.
 * Excludes owner_operator, executive, platform_admin from the grid.
 *
 * TODO: Multi-location kitchen_manager scoping deferred.
 * When user_profiles.primary_location_id lands, filter team to that location.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  role_label: string;
  location_name: string | null;
  avatar_initials: string;
  avatar_variant: 'ok' | 'warn' | 'bad';
  completion_pct: number;
  overdue_count: number;
  detail_text: string;
  pattern: null;
}

interface UseTeamGridResult {
  members: TeamMember[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const TEAM_ROLES = ['chef', 'kitchen_manager', 'kitchen_staff', 'facilities_manager', 'compliance_manager'];

const ROLE_LABELS: Record<string, string> = {
  chef: 'Chef',
  kitchen_manager: 'Kitchen Manager',
  kitchen_staff: 'Kitchen Staff',
  facilities_manager: 'Facilities Manager',
  compliance_manager: 'Compliance Manager',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function weekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function useTeamGrid(): UseTeamGridResult {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);
  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        // Fetch team members (exclude owner/exec/admin roles)
        const { data: users, error: uErr } = await supabase
          .from('user_profiles')
          .select('id, full_name, role')
          .eq('organization_id', orgId)
          .in('role', TEAM_ROLES)
          .eq('is_suspended', false);

        if (cancelled) return;
        if (uErr) throw new Error(uErr.message);
        if (!users || users.length === 0) {
          setMembers([]);
          return;
        }

        const ws = weekStart();
        const userIds = users.map(u => u.id);

        // Fetch task_instances for these users this week
        // Also fetch role-assigned tasks via task_definitions
        const { data: tasks, error: tErr } = await supabase
          .from('task_instances')
          .select('id, assigned_to, status, due_at, definition_id, task_definitions!inner(assigned_to_role)')
          .eq('organization_id', orgId)
          .gte('date', ws);

        if (cancelled) return;
        if (tErr) throw new Error(tErr.message);

        const now = new Date();

        // Build per-user stats
        const userRoleMap = new Map<string, string>();
        for (const u of users) {
          userRoleMap.set(u.id, u.role);
        }

        const statsMap = new Map<string, { completed: number; overdue: number; upcoming: number }>();
        for (const uid of userIds) {
          statsMap.set(uid, { completed: 0, overdue: 0, upcoming: 0 });
        }

        for (const t of (tasks || [])) {
          const task = t as Record<string, unknown>;
          const assignedTo = task.assigned_to as string | null;
          const status = task.status as string;
          const dueAt = task.due_at as string | null;
          const td = task.task_definitions as { assigned_to_role: string | null } | null;
          const assignedRole = td?.assigned_to_role || null;

          // Determine which user(s) this task belongs to
          const targetUserIds: string[] = [];
          if (assignedTo && userIds.includes(assignedTo)) {
            targetUserIds.push(assignedTo);
          } else if (!assignedTo && assignedRole) {
            // Role-based assignment: match to users with that role
            for (const u of users) {
              if (u.role === assignedRole) {
                targetUserIds.push(u.id);
              }
            }
          }

          for (const uid of targetUserIds) {
            const s = statsMap.get(uid);
            if (!s) continue;

            if (status === 'completed') {
              s.completed++;
            } else if (status === 'missed') {
              s.overdue++;
            } else if (status === 'pending') {
              if (dueAt && new Date(dueAt) < now) {
                s.overdue++;
              } else {
                s.upcoming++;
              }
            }
          }
        }

        // Build TeamMember array
        const result: TeamMember[] = users.map(u => {
          const s = statsMap.get(u.id) || { completed: 0, overdue: 0, upcoming: 0 };
          const total = s.completed + s.overdue + s.upcoming;
          const pct = total > 0 ? Math.round((s.completed / total) * 100) : 100;
          let variant: 'ok' | 'warn' | 'bad' = 'ok';
          if (pct < 80) variant = 'bad';
          else if (pct < 95) variant = 'warn';

          let detailText = '0 overdue';
          if (s.overdue === 1) detailText = '1 overdue';
          else if (s.overdue > 1) detailText = `${s.overdue} overdue`;

          return {
            id: u.id,
            full_name: u.full_name,
            role: u.role,
            role_label: ROLE_LABELS[u.role] || u.role,
            location_name: null,
            avatar_initials: initials(u.full_name),
            avatar_variant: variant,
            completion_pct: pct,
            overdue_count: s.overdue,
            detail_text: detailText,
            // TODO: Future team_patterns table lookup goes here
            pattern: null,
          };
        });

        // Sort worst first (lowest completion_pct)
        result.sort((a, b) => a.completion_pct - b.completion_pct);

        setMembers(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, trigger]);

  return { members, loading, error, refetch };
}
