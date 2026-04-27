/**
 * Task-related types. Derived from PROD schema as of 2026-04-27.
 * Tables: task_definitions, task_instances.
 * View: task_manager_feed.
 */

export type TaskPillar = 'food_safety' | 'facility_safety';

export type TaskType =
  | 'temperature_log'
  | 'checklist'
  | 'corrective_action'
  | 'document_upload'
  | 'equipment_check'
  | 'vendor_service'
  | 'custom';

export type TaskScheduleType = 'once' | 'daily' | 'weekly' | 'shift' | 'custom';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'skipped'
  | 'escalated';

export interface EscalationLevel {
  after_minutes: number;
  notify_role?: string | null;
  notify_user_id?: string | null;
  channel?: 'email' | 'sms' | 'push' | null;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
}

/** Maps to public.task_definitions — derived from PROD schema 2026-04-27. */
export interface TaskDefinition {
  id: string;
  organization_id: string;
  location_id?: string | null;
  name: string;
  description?: string | null;
  task_type: TaskType;
  pillar: TaskPillar;
  schedule_type: TaskScheduleType;
  schedule_days?: number[] | null;
  schedule_shifts?: string[] | null;
  due_time?: string | null;
  due_offset_minutes?: number | null;
  assigned_to_role?: string | null;
  assigned_to_user_id?: string | null;
  linked_checklist_id?: string | null;
  linked_equipment_id?: string | null;
  linked_vendor_id?: string | null;
  custom_task_detail?: string | null;
  reminder_minutes: number;
  due_soon_minutes: number;
  escalation_config: EscalationConfig;
  is_active: boolean;
  archived_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/** Maps to public.task_instances — derived from PROD schema 2026-04-27. */
export interface TaskInstance {
  id: string;
  definition_id: string;
  organization_id: string;
  location_id?: string | null;
  assigned_to?: string | null;
  assigned_by?: string | null;
  title: string;
  task_type: TaskType;
  pillar: TaskPillar;
  due_at: string;
  status: TaskStatus;
  completed_at?: string | null;
  completed_by?: string | null;
  completion_note?: string | null;
  linked_record_id?: string | null;
  reminder_sent_at?: string | null;
  due_soon_sent_at?: string | null;
  overdue_sent_at?: string | null;
  escalation_level: number;
  last_escalated_at?: string | null;
  date: string;
  shift?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maps to public.task_manager_feed view (joined task_instances + task_definitions,
 * archived rows excluded). All columns nullable because views expose nullable projections.
 */
export interface TaskFeedRow {
  id?: string | null;
  definition_id?: string | null;
  organization_id?: string | null;
  location_id?: string | null;
  assigned_to?: string | null;
  title?: string | null;
  task_type?: string | null;
  pillar?: string | null;
  due_at?: string | null;
  status?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  completion_note?: string | null;
  escalation_level?: number | null;
  date?: string | null;
  shift?: string | null;
  definition_name?: string | null;
  schedule_type?: string | null;
  schedule_days?: number[] | null;
  assigned_to_role?: string | null;
  definition_active?: boolean | null;
  escalation_config?: EscalationConfig | null;
}
