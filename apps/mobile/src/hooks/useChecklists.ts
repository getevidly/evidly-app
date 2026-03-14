/**
 * Checklist hooks for technician app
 *
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to Supabase.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  id: string;
  label: string;
  type: 'pass_fail' | 'text' | 'number' | 'photo' | 'select' | 'multi_select';
  required: boolean;
  photo_required: boolean;
  min_photos?: number;
  help_text?: string;
  fail_creates_deficiency?: boolean;
  deficiency_severity?: 'minor' | 'major' | 'critical';
  options?: string[];
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  service_type: string;
  checklist_phase: 'pre_service' | 'post_service' | 'inspection';
  items: ChecklistItem[];
  version: number;
}

export interface ChecklistResponse {
  item_id: string;
  value: string | number | boolean;
  photo_ids?: string[];
  notes?: string;
  voice_note_url?: string;
  ai_analysis?: Record<string, unknown>;
  answered_at: string;
  location?: { lat: number; lng: number };
}

export interface JobChecklist {
  id: string;
  job_id: string;
  template_id: string;
  checklist_phase: 'pre_service' | 'post_service' | 'inspection';
  responses: ChecklistResponse[];
  completion_percent: number;
  completed_at: string | null;
  qa_status: 'pending' | 'approved' | 'needs_revision' | null;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch checklist templates for a given service type.
 *
 * TODO: Replace stub with Supabase query against `checklist_templates` table
 *       filtered by service_type.
 */
export function useChecklistTemplates(serviceType: string) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      // TODO: Supabase query — supabase.from('checklist_templates').select('*').eq('service_type', serviceType)
      setTemplates([]);
    } catch {
      // Stub — no error state needed yet
    } finally {
      setLoading(false);
    }
  }, [serviceType]);

  return { templates, loading };
}

/**
 * Fetch a job's checklist for a specific phase.
 *
 * TODO: Replace stub with Supabase query against `job_checklists` table
 *       filtered by job_id and checklist_phase.
 */
export function useJobChecklist(jobId: string, phase: string) {
  const [checklist, setChecklist] = useState<JobChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      // TODO: Supabase query — supabase.from('job_checklists').select('*').eq('job_id', jobId).eq('checklist_phase', phase).single()
      setChecklist(null);
    } catch {
      // Stub — no error state needed yet
    } finally {
      setLoading(false);
    }
  }, [jobId, phase]);

  return { checklist, loading };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Save a single checklist item response.
 *
 * TODO: Supabase upsert into `checklist_responses` table and
 *       update `job_checklists.completion_percent`.
 */
export function useSaveChecklistResponse() {
  const mutate = useCallback(
    async (params: {
      checklistId: string;
      itemId: string;
      value: string | number | boolean;
      photoIds?: string[];
      notes?: string;
      voiceNoteUrl?: string;
    }) => {
      // TODO: Wire to Supabase
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}

/**
 * Mark a checklist as completed.
 *
 * TODO: Supabase update — supabase.from('job_checklists').update({ completed_at: new Date().toISOString(), completion_percent: 100 }).eq('id', checklistId)
 */
export function useCompleteChecklist() {
  const mutate = useCallback(async (checklistId: string) => {
    // TODO: Wire to Supabase
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}
