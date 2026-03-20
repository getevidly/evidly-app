// ── Service Request System Types ─────────────────────────────────

export type ServiceRequestStatus =
  | 'pending_vendor'
  | 'vendor_selected'
  | 'vendor_proposed_alt'
  | 'pending_operator'
  | 'confirmed'
  | 'canceled'
  | 'expired';

export type RequestType = 'scheduled' | 'on_demand' | 'out_of_cycle' | 'emergency';
export type Urgency = 'normal' | 'soon' | 'urgent' | 'emergency';

export interface ServiceRequest {
  id: string;
  organization_id: string;
  location_id: string | null;
  vendor_id: string;
  requested_by: string | null;

  service_type: string;
  request_type: RequestType;
  urgency: Urgency;
  notes: string | null;

  // Operator's proposed slots
  proposed_slot_1: string | null;
  proposed_slot_2: string | null;
  proposed_slot_3: string | null;

  // Vendor's alternative slots
  vendor_alt_slot_1: string | null;
  vendor_alt_slot_2: string | null;
  vendor_alt_slot_3: string | null;
  vendor_response_notes: string | null;

  // Confirmed result
  confirmed_datetime: string | null;
  confirmed_by: 'operator' | 'vendor' | 'auto' | null;

  calendar_event_id: string | null;
  status: ServiceRequestStatus;
  schedule_token_id: string | null;

  created_at: string;
  updated_at: string;

  // Joined fields (from queries)
  vendor_name?: string;
  vendor_email?: string;
  location_name?: string;
  requester_name?: string;
}

export interface CppAvailabilitySlot {
  id: string;
  vendor_id: string;
  location_id: string | null;
  service_type: string;
  slot_datetime: string;
  duration_minutes: number;
  is_available: boolean;
  claimed_by_request_id: string | null;
  created_at: string;
}

export interface ScheduleTokenData {
  valid: boolean;
  error?: string;
  request_id: string;
  vendor_name: string;
  service_type: string;
  service_name: string;
  location_name: string;
  organization_name: string;
  urgency: Urgency;
  proposed_slots: string[];
  expires_at: string;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}
