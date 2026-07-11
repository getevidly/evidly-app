/**
 * BrandingSync — bridges BrandingContext (context + localStorage) with the DB.
 *
 * Rendered inside BOTH AuthProvider and BrandingProvider (placed in App.tsx
 * between AuthProvider and DemoProvider). Uses normal hooks — no
 * onAuthStateChange, no auth lock contention.
 *
 * LOAD: when profile.organization_id becomes available, fetches
 *       organizations.branding and applies via updateBranding().
 * SAVE: watches branding state; writes user-initiated changes to DB
 *       (debounced 500 ms, with skip guard to avoid re-writing the
 *       value that was just loaded).
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import type { BrandingConfig } from '../contexts/BrandingContext';
import { supabase } from '../lib/supabase';

export function BrandingSync() {
  const { profile } = useAuth();
  const { branding, updateBranding } = useBranding();
  const orgId = profile?.organization_id;

  // ── Guards ────────────────────────────────────────────────
  // skipNextSaveRef: set to true before the DB-load calls updateBranding(),
  // so the save effect skips the resulting state change (don't re-write
  // what we just read).
  const skipNextSaveRef = useRef(true);
  // mountedRef: skip the very first save-effect invocation (initial
  // defaults / localStorage cache — not a user action).
  const mountedRef = useRef(false);
  // Debounce timer for DB writes.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── LOAD from DB ──────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: org, error } = await supabase
          .from('organizations')
          .select('branding')
          .eq('id', orgId)
          .single();

        if (cancelled) return;
        if (error) {
          console.warn('Branding DB load skipped:', error.message);
          return;
        }

        if (
          org?.branding &&
          typeof org.branding === 'object' &&
          Object.keys(org.branding as Record<string, unknown>).length > 0
        ) {
          skipNextSaveRef.current = true;
          updateBranding(org.branding as Partial<BrandingConfig>);
        }
      } catch (err) {
        console.error('Branding load error:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SAVE to DB (debounced, skip-guarded) ──────────────────
  useEffect(() => {
    // Always cancel any pending write first (debounce reset).
    clearTimeout(saveTimerRef.current);

    // Skip the initial render (default / cached branding, not a user change).
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    // Skip the render caused by the DB load's updateBranding() call.
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (!orgId) return;

    // Debounce: only write after 500 ms of no further changes.
    saveTimerRef.current = setTimeout(() => {
      supabase
        .from('organizations')
        .update({ branding })
        .eq('id', orgId)
        .then(({ error }) => {
          if (error) console.error('Branding persist failed:', error.message);
        });
    }, 500);

    return () => clearTimeout(saveTimerRef.current);
  }, [branding, orgId]);

  // Renders nothing — pure side-effect component.
  return null;
}
