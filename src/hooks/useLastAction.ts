import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { getDriftLabel } from '../constants/driftTypeLabels';

export interface LastAction {
  user: string;
  detail: string;
  location_name: string | null;
  timestamp: string;
}

interface Candidate {
  user_id: string | null;
  location_id: string | null;
  timestamp: string;
  detail: string;
}

function formatRelativeTime(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export { formatRelativeTime };

export function useLastAction(): LastAction | null {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  const fetchLastAction = useCallback(async () => {
    if (!profile?.organization_id) return;
    const orgId = profile.organization_id;
    const isStaff = userRole === 'kitchen_staff';
    const userId = profile.id;

    // Get org's location IDs for tables without organization_id
    const { data: orgLocs } = await supabase
      .from('locations')
      .select('id, name')
      .eq('organization_id', orgId);

    const locIds = (orgLocs || []).map((l: { id: string }) => l.id);
    const locNameMap = new Map((orgLocs || []).map((l: { id: string; name: string }) => [l.id, l.name]));

    // 6 parallel queries — each returns most recent row
    const results = await Promise.allSettled([
      // 1. temperature_logs (facility_id = location_id, logged_by = user)
      locIds.length > 0
        ? (() => {
            let q = supabase
              .from('temperature_logs')
              .select('logged_by, facility_id, created_at, temperature, log_type')
              .in('facility_id', locIds)
              .order('created_at', { ascending: false })
              .limit(1);
            if (isStaff) q = q.eq('logged_by', userId);
            return q.maybeSingle();
          })()
        : Promise.resolve({ data: null, error: null }),

      // 2. receiving_temp_logs (organization_id, received_by = user)
      (() => {
        let q = supabase
          .from('receiving_temp_logs')
          .select('received_by, location_id, created_at, item_description, vendor_name')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (isStaff) q = q.eq('received_by', userId);
        return q.maybeSingle();
      })(),

      // 3. checklist_completions (location_id, completed_by = user)
      locIds.length > 0
        ? (() => {
            let q = supabase
              .from('checklist_completions')
              .select('completed_by, location_id, completed_at')
              .in('location_id', locIds)
              .order('completed_at', { ascending: false })
              .limit(1);
            if (isStaff) q = q.eq('completed_by', userId);
            return q.maybeSingle();
          })()
        : Promise.resolve({ data: null, error: null }),

      // 4. documents (organization_id, uploaded_by = user)
      (() => {
        let q = supabase
          .from('documents')
          .select('uploaded_by, location_id, created_at, title')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (isStaff) q = q.eq('uploaded_by', userId);
        return q.maybeSingle();
      })(),

      // 5. corrective_actions (organization_id, created_by = user)
      (() => {
        let q = supabase
          .from('corrective_actions')
          .select('created_by, location_id, created_at, title')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (isStaff) q = q.eq('created_by', userId);
        return q.maybeSingle();
      })(),

      // 6. drift_catches (org_id, no user FK — skip for kitchen_staff)
      !isStaff
        ? supabase
            .from('drift_catches')
            .select('location_id, detected_at, drift_type, pillar')
            .eq('org_id', orgId)
            .order('detected_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    // Normalize results into candidates
    const candidates: Candidate[] = [];

    const extract = (r: PromiseSettledResult<{ data: unknown; error: unknown }>) =>
      r.status === 'fulfilled' ? (r.value as { data: Record<string, unknown> | null }).data : null;

    const tempLog = extract(results[0]);
    if (tempLog) {
      candidates.push({
        user_id: tempLog.logged_by as string,
        location_id: tempLog.facility_id as string,
        timestamp: tempLog.created_at as string,
        detail: `Logged ${tempLog.log_type || 'temp'} reading: ${tempLog.temperature}\u00B0`,
      });
    }

    const recvLog = extract(results[1]);
    if (recvLog) {
      candidates.push({
        user_id: recvLog.received_by as string,
        location_id: recvLog.location_id as string,
        timestamp: recvLog.created_at as string,
        detail: `Receiving temp: ${recvLog.item_description || recvLog.vendor_name || 'delivery'}`,
      });
    }

    const chkLog = extract(results[2]);
    if (chkLog) {
      candidates.push({
        user_id: chkLog.completed_by as string,
        location_id: chkLog.location_id as string,
        timestamp: chkLog.completed_at as string,
        detail: 'Completed checklist',
      });
    }

    const docLog = extract(results[3]);
    if (docLog) {
      candidates.push({
        user_id: docLog.uploaded_by as string,
        location_id: docLog.location_id as string,
        timestamp: docLog.created_at as string,
        detail: `Uploaded: ${docLog.title || 'document'}`,
      });
    }

    const caLog = extract(results[4]);
    if (caLog) {
      candidates.push({
        user_id: caLog.created_by as string,
        location_id: caLog.location_id as string,
        timestamp: caLog.created_at as string,
        detail: `Corrective action: ${caLog.title || 'item'}`,
      });
    }

    const driftLog = extract(results[5]);
    if (driftLog) {
      candidates.push({
        user_id: null,
        location_id: driftLog.location_id as string,
        timestamp: driftLog.detected_at as string,
        detail: `EvidLY caught: ${getDriftLabel(driftLog.drift_type as string, { form: 'noun' })}`,
      });
    }

    if (candidates.length === 0) {
      setLastAction(null);
      return;
    }

    // Pick most recent
    candidates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const winner = candidates[0];

    // Resolve user name
    let userName = 'System';
    if (winner.user_id) {
      const { data: up } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', winner.user_id)
        .maybeSingle();
      userName = up?.full_name || 'Team member';
    }

    // Resolve location name from pre-fetched map
    const locationName = winner.location_id ? (locNameMap.get(winner.location_id) || null) : null;

    setLastAction({
      user: userName,
      detail: winner.detail,
      location_name: locationName,
      timestamp: winner.timestamp,
    });
  }, [profile?.organization_id, profile?.id, userRole]);

  useEffect(() => {
    fetchLastAction();
    const interval = setInterval(fetchLastAction, 60_000);
    return () => clearInterval(interval);
  }, [fetchLastAction]);

  return lastAction;
}
