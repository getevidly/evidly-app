/**
 * Incident-related types. Derived from PROD schema as of 2026-04-27.
 * Tables: incidents, incident_timeline, incident_comments, incident_templates.
 */

export type IncidentPillar = 'food_safety' | 'facility_safety';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'verified';

/** Maps to public.incident_templates — derived from PROD schema 2026-04-27. */
export interface IncidentTemplate {
  id: string;
  organization_id?: string | null;
  pillar: IncidentPillar;
  category: string;
  title: string;
  description?: string | null;
  severity: IncidentSeverity;
  suggested_root_cause?: string | null;
  regulation_reference?: string | null;
  recommended_timeframe_days?: number | null;
  is_system: boolean;
  is_active: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One row in an audit/history trail stored as jsonb[].
 * Used by Incident.history and CorrectiveAction.history.
 * Replaces the demo-only CAHistoryEntry (src/data/correctiveActionsDemoData.ts)
 * which will be deprecated in Sprint 4 when CA goes live.
 */
export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  actor_id?: string | null;
  actor_name?: string | null;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  notes?: string | null;
}

/** Maps to public.incidents — derived from PROD schema 2026-04-27. */
export interface Incident {
  id: string;
  organization_id: string;
  template_id?: string | null;
  incident_number: string;
  pillar: IncidentPillar;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  location_id?: string | null;
  location_name?: string | null;
  assigned_to?: string | null;
  reported_by?: string | null;
  corrective_action?: string | null;
  action_chips?: string[] | null;
  resolution_summary?: string | null;
  root_cause?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  source_label?: string | null;
  photos?: string[] | null;
  resolution_photos?: string[] | null;
  requires_regulatory_report: boolean;
  regulatory_citation?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  archived_at?: string | null;
  linked_corrective_action_id?: string | null;
  ai_draft?: string | null;
  history?: HistoryEntry[] | null;
  created_at: string;
  updated_at: string;
}

/** Maps to public.incident_timeline — derived from PROD schema 2026-04-27. */
export interface IncidentTimelineEntry {
  id: string;
  incident_id: string;
  action: string;
  status?: string | null;
  performed_by?: string | null;
  notes?: string | null;
  photos?: string[] | null;
  created_at: string;
}

/** Maps to public.incident_comments — derived from PROD schema 2026-04-27. */
export interface IncidentComment {
  id: string;
  incident_id: string;
  author_id: string;
  comment_text: string;
  archived_at?: string | null;
  created_at: string;
}
