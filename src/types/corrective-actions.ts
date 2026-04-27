/**
 * Corrective Actions types. Derived from PROD schema as of 2026-04-27.
 * Tables: corrective_actions, corrective_action_templates.
 */

import type { HistoryEntry } from './incidents';

export type CAPillar = 'food_safety' | 'facility_safety';
export type CACategory = 'food_safety' | 'facility_safety' | 'operational';
export type CASeverity = 'critical' | 'high' | 'medium' | 'low';
export type CASourceType = 'inspection' | 'checklist' | 'temperature' | 'self_inspection' | 'manual' | 'incident';
export type CAStatus = 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'archived';

/** One note attached to a corrective action — element of the notes jsonb array. */
export interface CANote {
  id: string;
  timestamp: string;
  author_id?: string | null;
  author_name?: string | null;
  body: string;
}

/** One attachment on a corrective action — element of the attachments jsonb array. */
export interface CAAttachment {
  id: string;
  uploaded_at: string;
  uploaded_by?: string | null;
  filename: string;
  storage_url: string;
  mime_type?: string | null;
  size_bytes?: number | null;
}

/** Maps to public.corrective_actions — derived from PROD schema 2026-04-27. */
export interface CorrectiveAction {
  id: string;
  organization_id: string;
  location_id?: string | null;
  template_id?: string | null;
  title: string;
  description?: string | null;
  category?: CACategory | null;
  severity: CASeverity;
  status?: CAStatus | null;
  source?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  root_cause?: string | null;
  corrective_steps?: string | null;
  preventive_measures?: string | null;
  regulation_reference?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  closed_at?: string | null;
  archived_at?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  source_type?: CASourceType | null;
  source_id?: string | null;
  assigned_by_user_id?: string | null;
  notes?: CANote[] | null;
  attachments?: CAAttachment[] | null;
  pillar: CAPillar;
  assigned_at?: string | null;
  resolved_by?: string | null;
  resolution_note?: string | null;
  verification_note?: string | null;
  ai_draft?: string | null;
  history?: HistoryEntry[] | null;
}

/** Maps to public.corrective_action_templates — derived from PROD schema 2026-04-27. */
export interface CorrectiveActionTemplate {
  id: string;
  organization_id?: string | null;
  title: string;
  description?: string | null;
  category: CACategory;
  severity: CASeverity;
  suggested_root_cause?: string | null;
  regulation_reference?: string | null;
  recommended_timeframe_days?: number | null;
  is_system?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}
