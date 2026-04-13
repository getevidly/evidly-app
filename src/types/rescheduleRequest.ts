// ── Service Reschedule Request Types — RESCHEDULE-EVIDLY-01 ─────

export type RescheduleStatus = 'pending' | 'confirmed' | 'declined' | 'canceled' | 'expired';
export type RescheduleUrgency = 'normal' | 'soon' | 'urgent';

export interface RescheduleRequest {
  id: string;
  organization_id: string;
  location_id: string;
  service_type_code: string;
  schedule_id: string | null;
  requested_by: string | null;
  original_due_date: string;
  requested_date: string;
  reason: string | null;
  urgency: RescheduleUrgency;
  vendor_confirmed_date: string | null;
  vendor_response_notes: string | null;
  status: RescheduleStatus;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  requester_name?: string;
  location_name?: string;
  service_name?: string;
}

export interface SubmitRescheduleParams {
  organization_id: string;
  location_id: string;
  service_type_code: string;
  schedule_id: string | null;
  original_due_date: string;
  requested_date: string;
  reason?: string;
  urgency: RescheduleUrgency;
}
