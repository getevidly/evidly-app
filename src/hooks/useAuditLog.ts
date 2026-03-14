/**
 * AUDIT-FIX-04 / FIX 4 — Audit log RPC hook
 *
 * Extracted from RequireAdmin to remove direct supabase.rpc() calls from components.
 * Fire-and-forget audit logging.
 */

import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAuditLog() {
  const logEvent = useCallback(async (
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ) => {
    try {
      await supabase.rpc('log_audit_event', {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_metadata: metadata || {},
      });
    } catch {
      // Fire-and-forget — never block the UI
    }
  }, []);

  return { logEvent };
}
