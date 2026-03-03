import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../contexts/RoleContext';
import type { MobileAlert } from '../data/mobileDemoData';

interface UseMobileAlertsResult {
  alerts: MobileAlert[];
  isLoading: boolean;
}

export function useMobileAlerts(orgId: string | undefined, role: UserRole): UseMobileAlertsResult {
  const [alerts, setAlerts] = useState<MobileAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAlerts() {
      setIsLoading(true);
      const allAlerts: MobileAlert[] = [];

      // 1. System alerts (unresolved)
      try {
        const { data } = await supabase
          .from('alerts')
          .select('id, title, message, alert_type, created_at')
          .eq('organization_id', orgId)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(3);

        if (data) {
          data.forEach((a: any) => {
            const type: MobileAlert['type'] = a.alert_type === 'critical' ? 'critical'
              : a.alert_type === 'warning' ? 'warning'
              : 'info';
            allAlerts.push({
              id: `alert-${a.id}`,
              text: a.title || a.message || 'System alert',
              type,
              path: '/alerts',
            });
          });
        }
      } catch { /* table may not exist */ }

      // 2. Expiring documents (within 14 days) — management roles
      if (['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager'].includes(role)) {
        try {
          const fourteenDays = new Date();
          fourteenDays.setDate(fourteenDays.getDate() + 14);
          const today = new Date().toISOString().split('T')[0];

          const { count } = await supabase
            .from('documents')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .not('expiration_date', 'is', null)
            .lte('expiration_date', fourteenDays.toISOString().split('T')[0])
            .gte('expiration_date', today);

          if (count && count > 0) {
            allAlerts.push({
              id: 'doc-expiring',
              text: `${count} document${count !== 1 ? 's' : ''} expiring within 14 days`,
              type: 'warning',
              path: '/documents',
            });
          }
        } catch { /* table may not exist */ }
      }

      // 3. Open incidents older than 24 hours
      if (['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager'].includes(role)) {
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          const { count } = await supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .in('status', ['open', 'investigating'])
            .lte('created_at', yesterday.toISOString());

          if (count && count > 0) {
            allAlerts.push({
              id: 'incidents-open',
              text: `${count} unresolved incident${count !== 1 ? 's' : ''} older than 24 hours`,
              type: 'critical',
              path: '/incidents',
            });
          }
        } catch { /* table may not exist */ }
      }

      // 4. Overdue equipment maintenance — owner + facilities
      if (['platform_admin', 'owner_operator', 'facilities_manager'].includes(role)) {
        try {
          const today = new Date().toISOString().split('T')[0];

          const { count } = await supabase
            .from('equipment')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .not('next_maintenance_due', 'is', null)
            .lt('next_maintenance_due', today);

          if (count && count > 0) {
            allAlerts.push({
              id: 'equip-overdue',
              text: `${count} equipment item${count !== 1 ? 's' : ''} overdue for maintenance`,
              type: 'warning',
              path: '/equipment',
            });
          }
        } catch { /* table may not exist */ }
      }

      // Sort by severity: critical → warning → info → success
      const severityOrder: Record<MobileAlert['type'], number> = {
        critical: 0, warning: 1, info: 2, success: 3,
      };
      allAlerts.sort((a, b) => severityOrder[a.type] - severityOrder[b.type]);

      if (!cancelled) {
        setAlerts(allAlerts.slice(0, 5)); // max 5 alerts
        setIsLoading(false);
      }
    }

    fetchAlerts();

    // Refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orgId, role]);

  return { alerts, isLoading };
}
