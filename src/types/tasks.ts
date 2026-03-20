/**
 * tasks.ts — TASK-ASSIGN-01
 *
 * TypeScript interfaces for the task assignment & scheduling system.
 * Maps to task_definitions, task_instances, task_notification_prefs tables.
 */

export type TaskType =
  | 'temperature_log'
  | 'checklist'
  | 'corrective_action'
  | 'document_upload'
  | 'equipment_check'
  | 'vendor_service'
  | 'custom';

export type ScheduleType = 'once' | 'daily' | 'weekly' | 'shift' | 'custom';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'skipped'
  | 'escalated';

export interface EscalationLevel {
  delay_minutes: number;
  notify_role: string;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
}

export interface TaskDefinition {
  id: string;
  org_id: string;
  location_id: string | null;
  name: string;
  description: string | null;
  task_type: TaskType;
  schedule_type: ScheduleType;
  schedule_days: number[] | null;
  schedule_shifts: string[] | null;
  due_time: string | null;
  due_offset_minutes: number | null;
  assigned_to_role: string | null;
  assigned_to_user_id: string | null;
  linked_checklist_id: string | null;
  linked_equipment_id: string | null;
  linked_vendor_id: string | null;
  custom_task_detail: string | null;
  reminder_minutes: number;
  due_soon_minutes: number;
  escalation_config: EscalationConfig;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInstance {
  id: string;
  definition_id: string;
  org_id: string;
  location_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  title: string;
  task_type: TaskType;
  due_at: string;
  status: TaskStatus;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  linked_record_id: string | null;
  reminder_sent_at: string | null;
  due_soon_sent_at: string | null;
  overdue_sent_at: string | null;
  escalation_level: number;
  last_escalated_at: string | null;
  date: string;
  shift: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskNotificationPref {
  id: string;
  user_id: string;
  org_id: string;
  task_type: TaskType | null;
  notify_push: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  reminder_minutes: number;
}
