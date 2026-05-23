/**
 * useDraftReceivingNotes.ts
 *
 * Wraps the draft-receiving-notes edge function.
 * In demo mode, generates a local template string.
 * In live mode, calls the edge function and returns the AI-drafted notes.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';

export interface DraftReceivingInput {
  vendor_name: string;
  food_category: string;
  received_at: string;
  items: Array<{
    description: string;
    temperature: number;
    target_max: number;
    in_range: boolean;
  }>;
  received_by: string;
  target_temp_label: string;
}

export function useDraftReceivingNotes() {
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (input: DraftReceivingInput) => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
        const passCount = input.items.filter(i => i.in_range).length;
        const failCount = input.items.length - passCount;
        const time = new Date(input.received_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        let text = `Received ${input.items.length} item${input.items.length !== 1 ? 's' : ''} from ${input.vendor_name} at ${time}.`;
        if (failCount === 0) {
          text += ` All items within acceptable range (≤${input.items[0]?.target_max ?? 41}°F). Rotated FIFO into walk-in cooler.`;
        } else {
          const failNames = input.items.filter(i => !i.in_range).map(i => `${i.description} (${i.temperature}°F)`).join(', ');
          text += ` ${passCount} item${passCount !== 1 ? 's' : ''} in range. ${failCount} item${failCount !== 1 ? 's' : ''} out of range: ${failNames}.`;
        }
        text += ` Received by ${input.received_by || 'staff'}.`;
        setDraft(text);
        return;
      }

      const { data, error: invokeErr } = await supabase.functions.invoke('draft-receiving-notes', {
        body: input,
      });

      if (invokeErr) {
        if (invokeErr.message?.includes('501') || invokeErr.message?.includes('not configured')) {
          toast.error('AI Assist not yet configured');
          setError('not_configured');
        } else {
          throw invokeErr;
        }
        return;
      }

      if (data?.notes) {
        setDraft(data.notes);
      } else {
        throw new Error('No notes returned');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate notes';
      console.warn('[useDraftReceivingNotes]', msg);
      setError(msg);
      toast.error('AI notes generation failed');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  const reset = useCallback(() => {
    setDraft(null);
    setError(null);
  }, []);

  return { generate, loading, draft, error, reset };
}
