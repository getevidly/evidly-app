import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CompleteHandoffParams {
  locationId: string;
  organizationId: string;
  shiftName: string;
  shiftDate: string;
  notes: string;
  stats: { tempCount: number; checklistCount: number; caResolved: number };
  openItems: string[];
  shiftTemplateId: string | null;
}

export function useCompleteHandoff() {
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const complete = useCallback(async (params: CompleteHandoffParams): Promise<{ success: boolean; error?: string }> => {
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('shift_handoffs')
        .insert({
          location_id: params.locationId,
          organization_id: params.organizationId,
          shift_date: params.shiftDate,
          shift_name: params.shiftName,
          handed_off_by: userId,
          notes: params.notes || null,
          temp_count: params.stats.tempCount,
          checklist_count: params.stats.checklistCount,
          ca_resolved: params.stats.caResolved,
          open_items: params.openItems,
          completed_at: new Date().toISOString(),
          stats_snapshot: {
            ...params.stats,
            openItems: params.openItems,
            shiftTemplateId: params.shiftTemplateId,
          },
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to complete handoff';
      console.error('[ShiftHandoff]', err);
      return { success: false, error: msg };
    } finally {
      setIsSubmitting(false);
    }
  }, [session?.user?.id]);

  return { complete, isSubmitting };
}
