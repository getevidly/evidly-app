// SUPERPOWERS-APP-01 — SP7: Team Leaderboard Page
import { useState, useEffect } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useRole } from '../../contexts/RoleContext';
import { TeamLeaderboardCard } from '../../components/superpowers/TeamLeaderboardCard';
import { computeLeaderboard } from '../../lib/teamLeaderboard';
import { supabase } from '../../lib/supabase';
import { Medal } from 'lucide-react';

export function TeamLeaderboard() {
  useDemoGuard();
  const { user, profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);

  const isKitchenStaff = userRole === 'kitchen_staff';

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    async function loadLeaderboard() {
      try {
        const orgId = profile?.organization_id;
        if (!orgId) { setLoading(false); return; }

        // Get team members
        const { data: teamMembers } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .eq('organization_id', orgId)
          .eq('is_active', true);

        if (!teamMembers?.length) { setLoading(false); return; }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

        // Get checklist completions and temp logs for the team
        const [checklistRes, tempRes, caRes] = await Promise.all([
          supabase
            .from('checklist_template_completions')
            .select('completed_by, status')
            .eq('organization_id', orgId)
            .gte('completed_at', thirtyDaysAgo),
          supabase
            .from('temperature_logs')
            .select('recorded_by, temp_pass')
            .eq('organization_id', orgId)
            .gte('reading_time', thirtyDaysAgo),
          supabase
            .from('corrective_actions')
            .select('assigned_to, status, created_at, resolved_at')
            .eq('organization_id', orgId)
            .gte('created_at', thirtyDaysAgo),
        ]);

        const employeeData = teamMembers.map(member => {
          const memberChecklists = (checklistRes.data || []).filter(c => c.completed_by === member.id);
          const memberTemps = (tempRes.data || []).filter(t => t.recorded_by === member.id);
          const memberCAs = (caRes.data || []).filter(ca => ca.assigned_to === member.id && ca.status === 'resolved');

          // Avg CA resolution days
          let avgCADays = null;
          if (memberCAs.length > 0) {
            const totalDays = memberCAs.reduce((sum, ca) => {
              const created = new Date(ca.created_at);
              const resolved = ca.resolved_at ? new Date(ca.resolved_at) : new Date();
              return sum + Math.floor((resolved.getTime() - created.getTime()) / 86400000);
            }, 0);
            avgCADays = totalDays / memberCAs.length;
          }

          return {
            userId: member.id,
            name: member.full_name || 'Team Member',
            checklistsCompleted: memberChecklists.filter(c => c.status === 'completed').length,
            checklistsAssigned: memberChecklists.length || 1,
            tempLogsOnTime: memberTemps.filter(t => t.temp_pass).length,
            tempLogsTotal: memberTemps.length || 1,
            avgCAResolutionDays: avgCADays,
          };
        });

        const result = computeLeaderboard(employeeData);
        setEntries(result);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [isDemoMode, profile?.organization_id]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#1E2D4D] rounded-xl">
          <Medal className="h-6 w-6 text-[#A08C5A]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0B1628]">
            {isKitchenStaff ? 'Your Compliance Score' : 'Team Leaderboard'}
          </h1>
          <p className="text-sm text-[#6B7F96]">
            {isKitchenStaff
              ? 'Your compliance task performance score'
              : 'Staff ranked by compliance task performance'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A] mx-auto" />
          <p className="mt-3 text-sm text-[#6B7F96]">Calculating team scores...</p>
        </div>
      ) : (
        <TeamLeaderboardCard
          entries={entries}
          isKitchenStaff={isKitchenStaff}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}
