import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../contexts/RoleContext';
import type { MobileTask } from '../data/mobileDemoData';

interface UseMobileTasksResult {
  tasks: MobileTask[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Which task sources each role sees
const ROLE_TASK_SOURCES: Record<UserRole, string[]> = {
  platform_admin: ['checklists', 'temperatures', 'documents', 'equipment', 'incidents', 'haccp', 'calendar'],
  owner_operator: ['checklists', 'temperatures', 'documents', 'equipment', 'incidents', 'haccp', 'calendar'],
  executive: ['documents', 'incidents', 'calendar'],
  compliance_manager: ['documents', 'incidents', 'haccp', 'calendar'],
  facilities_manager: ['equipment', 'calendar'],
  chef: ['checklists', 'temperatures', 'haccp', 'calendar'],
  kitchen_manager: ['checklists', 'temperatures', 'documents', 'incidents', 'haccp', 'calendar'],
  kitchen_staff: ['checklists', 'temperatures'],
};

export function useMobileTasks(orgId: string | undefined, role: UserRole): UseMobileTasksResult {
  const [tasks, setTasks] = useState<MobileTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!orgId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const sources = ROLE_TASK_SOURCES[role] || [];

    async function fetchTasks() {
      setIsLoading(true);
      setError(null);

      const allTasks: MobileTask[] = [];
      const today = new Date().toISOString().split('T')[0];

      try {
        // 1. Checklists — active templates without today's completion
        if (sources.includes('checklists')) {
          try {
            const [{ data: templates }, { data: completions }] = await Promise.all([
              supabase
                .from('checklist_templates')
                .select('id, name, frequency')
                .eq('organization_id', orgId)
                .eq('is_active', true)
                .limit(20),
              supabase
                .from('checklist_template_completions')
                .select('template_id')
                .eq('organization_id', orgId)
                .gte('completed_at', today + 'T00:00:00')
                .lte('completed_at', today + 'T23:59:59'),
            ]);

            if (templates) {
              const completedIds = new Set((completions || []).map((c: any) => c.template_id));
              templates.forEach((t: any) => {
                if (!completedIds.has(t.id)) {
                  allTasks.push({
                    id: `checklist-${t.id}`,
                    title: t.name,
                    subtitle: t.frequency === 'daily' ? 'Daily checklist' : (t.frequency || 'Checklist'),
                    icon: '📋',
                    status: 'due',
                    time: 'Due today',
                    path: '/checklists',
                  });
                }
              });
            }
          } catch { /* table may not exist — skip silently */ }
        }

        // 2. Temperature readings — equipment needing temp checks today
        if (sources.includes('temperatures')) {
          try {
            const [{ data: equipment }, { data: readings }] = await Promise.all([
              supabase
                .from('temperature_equipment')
                .select('id, name, equipment_type')
                .eq('organization_id', orgId)
                .eq('is_active', true)
                .limit(20),
              supabase
                .from('temperature_logs')
                .select('equipment_id')
                .eq('facility_id', orgId)
                .gte('reading_time', today + 'T00:00:00')
                .lte('reading_time', today + 'T23:59:59'),
            ]);

            if (equipment) {
              const checkedIds = new Set((readings || []).map((r: any) => r.equipment_id));
              equipment.forEach((e: any) => {
                if (!checkedIds.has(e.id)) {
                  const typeLabel = e.equipment_type === 'storage_cold' ? 'Cold Storage'
                    : e.equipment_type === 'storage_frozen' ? 'Freezer'
                    : e.equipment_type === 'holding_hot' ? 'Hot Holding'
                    : e.equipment_type === 'holding_cold' ? 'Cold Holding'
                    : 'Temperature reading';
                  allTasks.push({
                    id: `temp-${e.id}`,
                    title: `Temp Reading: ${e.name}`,
                    subtitle: typeLabel,
                    icon: '🌡️',
                    status: 'due',
                    time: 'Due today',
                    path: '/temp-logs',
                  });
                }
              });
            }
          } catch { /* table may not exist — skip silently */ }
        }

        // 3. Expiring documents — within 30 days
        if (sources.includes('documents')) {
          try {
            const thirtyDays = new Date();
            thirtyDays.setDate(thirtyDays.getDate() + 30);
            const { data: docs } = await supabase
              .from('documents')
              .select('id, title, expiration_date')
              .eq('organization_id', orgId)
              .not('expiration_date', 'is', null)
              .lte('expiration_date', thirtyDays.toISOString().split('T')[0])
              .gte('expiration_date', today)
              .order('expiration_date', { ascending: true })
              .limit(10);

            if (docs) {
              docs.forEach((d: any) => {
                const daysLeft = Math.ceil(
                  (new Date(d.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                allTasks.push({
                  id: `doc-${d.id}`,
                  title: `${d.title} expiring`,
                  subtitle: daysLeft <= 0 ? 'Expired' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`,
                  icon: '📄',
                  status: daysLeft <= 7 ? 'due' : 'upcoming',
                  time: daysLeft <= 0 ? 'Expired' : `Due in ${daysLeft} days`,
                  path: '/documents',
                });
              });
            }
          } catch { /* table may not exist — skip silently */ }
        }

        // 4. Equipment maintenance — overdue or due within 7 days
        if (sources.includes('equipment')) {
          try {
            const sevenDays = new Date();
            sevenDays.setDate(sevenDays.getDate() + 7);
            const { data: equip } = await supabase
              .from('equipment')
              .select('id, name, equipment_type, next_maintenance_due')
              .eq('organization_id', orgId)
              .eq('is_active', true)
              .not('next_maintenance_due', 'is', null)
              .lte('next_maintenance_due', sevenDays.toISOString().split('T')[0])
              .order('next_maintenance_due', { ascending: true })
              .limit(10);

            if (equip) {
              equip.forEach((e: any) => {
                const daysUntil = Math.ceil(
                  (new Date(e.next_maintenance_due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                allTasks.push({
                  id: `equip-${e.id}`,
                  title: `${e.name} maintenance`,
                  subtitle: e.equipment_type || 'Equipment service',
                  icon: '🔧',
                  status: daysUntil <= 0 ? 'due' : 'upcoming',
                  time: daysUntil <= 0 ? 'Overdue' : `Due in ${daysUntil} days`,
                  path: '/equipment',
                });
              });
            }
          } catch { /* table may not exist — skip silently */ }
        }

        // 5. Open incidents
        if (sources.includes('incidents')) {
          try {
            const { data: incidents } = await supabase
              .from('incidents')
              .select('id, title, type, severity, status, created_at')
              .eq('organization_id', orgId)
              .in('status', ['open', 'investigating', 'in_progress'])
              .order('created_at', { ascending: false })
              .limit(5);

            if (incidents) {
              incidents.forEach((inc: any) => {
                allTasks.push({
                  id: `incident-${inc.id}`,
                  title: inc.title || 'Review Incident',
                  subtitle: `${inc.type || 'Incident'} — ${inc.severity || 'Medium'}`,
                  icon: '⚠️',
                  status: 'due',
                  time: 'Needs response',
                  path: '/incidents',
                });
              });
            }
          } catch { /* table may not exist — skip silently */ }
        }

        // 6. HACCP corrective actions
        if (sources.includes('haccp')) {
          try {
            const { data: capas } = await supabase
              .from('haccp_corrective_actions')
              .select('id, plan_name, ccp_number, deviation, status')
              .eq('organization_id', orgId)
              .in('status', ['open', 'in_progress'])
              .order('created_at', { ascending: false })
              .limit(5);

            if (capas) {
              capas.forEach((ca: any) => {
                allTasks.push({
                  id: `haccp-${ca.id}`,
                  title: 'Corrective Action Required',
                  subtitle: `${ca.plan_name || 'HACCP'} — CCP ${ca.ccp_number || ''}`.trim(),
                  icon: '🔴',
                  status: 'due',
                  time: 'Open',
                  path: '/haccp',
                });
              });
            }
          } catch { /* table may not exist — skip silently */ }
        }

        // 7. Today's calendar events
        if (sources.includes('calendar')) {
          try {
            const { data: events } = await supabase
              .from('calendar_events')
              .select('id, title, type, start_time')
              .eq('organization_id', orgId)
              .eq('date', today)
              .order('start_time', { ascending: true })
              .limit(5);

            if (events) {
              events.forEach((ev: any) => {
                allTasks.push({
                  id: `event-${ev.id}`,
                  title: ev.title,
                  subtitle: ev.type || 'Scheduled event',
                  icon: '📅',
                  status: 'upcoming',
                  time: ev.start_time || 'Today',
                  path: '/calendar',
                });
              });
            }
          } catch { /* table may not exist — skip silently */ }
        }

        // Sort: due items first, then upcoming
        allTasks.sort((a, b) => {
          if (a.status === 'due' && b.status !== 'due') return -1;
          if (a.status !== 'due' && b.status === 'due') return 1;
          return 0;
        });

        if (!cancelled) {
          setTasks(allTasks.slice(0, 20)); // max 20 tasks
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setTasks([]);
          setIsLoading(false);
        }
      }
    }

    fetchTasks();

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchTasks, 2 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orgId, role, refreshKey]);

  return { tasks, isLoading, error, refetch };
}
