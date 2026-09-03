/**
 * useCountyBriefingActions — the one definition of the three county-briefing
 * write/read actions.
 *
 * These lived inline in OutreachTab as closures over its state, which meant a
 * second surface could not call them without copying them. Copying a send is
 * exactly the thing worth avoiding, so they moved here: OutreachTab and
 * BriefingsTab now invoke the same functions, against the same edge-function
 * actions, with the same guards.
 *
 * The bodies are unchanged from OutreachTab — the confirm dialog, the paused
 * short-circuit, the error shapes and the flash copy are all preserved
 * verbatim. Approval, lapse and jurisdiction-hash checks live server-side in
 * the `send` action and are untouched by this move.
 */
import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface CountyBriefingActionDeps {
  /** Master pause flag — a paused console refuses to send. */
  paused: boolean;
  /** The caller's own loading-key state setter, so its buttons keep working. */
  setActionLoading: (key: string | null) => void;
  /** Toast/flash callback. */
  flash: (msg: string) => void;
  /** Receives the rendered preview HTML and the county it belongs to. */
  onPreview: (html: string, county: string) => void;
  /** What the caller does after a successful write — OutreachTab passes loadAll. */
  onDone: () => void;
}

export function useCountyBriefingActions(deps: CountyBriefingActionDeps) {
  const { paused, setActionLoading, flash, onPreview, onDone } = deps;

  const handlePreview = useCallback(
    async (county: string, variant?: string, jurisdictionId?: string) => {
      const key = jurisdictionId || county;
      setActionLoading(`preview-${key}`);
      const reqBody: any = { action: 'preview', county, variant: variant || 'cold' };
      if (jurisdictionId) reqBody.jurisdiction_id = jurisdictionId;
      const { data, error } = await supabase.functions.invoke('county-briefing', {
        body: reqBody,
      });
      setActionLoading(null);
      if (error || !data?.preview_html) {
        flash(`Preview failed: ${error?.message || data?.error || 'Unknown'}`);
        return;
      }
      onPreview(data.preview_html, county);
    },
    [setActionLoading, flash, onPreview],
  );

  const handleApprove = useCallback(
    async (county: string) => {
      setActionLoading(`approve-${county}`);
      const { data, error } = await supabase.functions.invoke('county-briefing', {
        body: { action: 'approve', county },
      });
      setActionLoading(null);
      if (error || !data?.approval_id) {
        flash(`Approve failed: ${error?.message || data?.error || 'Unknown'}`);
        return;
      }
      flash(`${county} approved`);
      onDone();
    },
    [setActionLoading, flash, onDone],
  );

  const handleSend = useCallback(
    async (county: string, queuedCount: number) => {
      if (paused) { flash('Sending is paused'); return; }
      if (!confirm(`Send the ${county} briefing to ${queuedCount} recipient${queuedCount !== 1 ? 's' : ''} now?`)) return;
      setActionLoading(`send-${county}`);
      const { data, error } = await supabase.functions.invoke('county-briefing', {
        body: { action: 'send', county },
      });
      setActionLoading(null);
      if (error) {
        flash(`Send failed: ${error.message || data?.error || 'Unknown'}`);
        return;
      }
      flash(`${county}: ${data.sent} sent, ${data.failed} failed, ${data.held} held`);
      onDone();
    },
    [paused, setActionLoading, flash, onDone],
  );

  return { handlePreview, handleApprove, handleSend };
}
