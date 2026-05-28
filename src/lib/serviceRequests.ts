/**
 * serviceRequests.ts — SERVICE-REQUEST-HELPER
 *
 * App-layer helper for submitting service requests with Sprint 1.3 columns.
 * Inserts the request row, then invokes route-service-request edge function
 * for CPP/vendor routing and regulatory floor breach detection.
 */

import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────────

export type RequestSubtype =
  | 'schedule'
  | 'cadence_change'
  | 'reschedule'
  | 'activate'
  | 'deactivate'
  | 'quote_request';

export interface SubmitServiceRequestParams {
  organizationId: string;
  locationId?: string;
  vendorId: string;
  serviceCode: string;
  serviceConfigurationId?: string;
  requestSubtype: RequestSubtype;
  currentCadenceDays?: number;
  proposedCadenceDays?: number;
  proposedVisitDate?: string;
  notes?: string;
  urgency?: string;
  requestType?: string;
  proposedSlots?: string[];
}

export interface SubmitServiceRequestResult {
  request_id: string;
  routing_target: 'evidly_admin' | 'vendor_thread';
  status: string;
  is_floor_breach: boolean;
  email_sent?: boolean;
  thread_id?: string | null;
}

export interface FloorCheckResult {
  breach: boolean;
  regulatoryFloorDays: number | null;
  standards: string[];
}

// ── Regulatory floor check ───────────────────────────────────────

/**
 * Check whether a proposed cadence exceeds the regulatory floor
 * for a given service code. A breach means the proposed interval
 * is longer than the regulatory minimum frequency.
 */
export async function checkRegulatoryFloor(
  serviceCode: string,
  proposedCadenceDays: number
): Promise<FloorCheckResult> {
  const { data } = await supabase
    .from('service_type_definitions')
    .select('regulatory_floor_days, regulatory_standards')
    .eq('code', serviceCode)
    .single();

  const floor = data?.regulatory_floor_days ?? null;
  const standards: string[] = (data as any)?.regulatory_standards ?? [];
  if (floor == null) return { breach: false, regulatoryFloorDays: null, standards };

  return {
    breach: proposedCadenceDays > floor,
    regulatoryFloorDays: floor,
    standards,
  };
}

// ── Submit + route ───────────────────────────────────────────────

/**
 * Submit a service request and route it.
 * 1. Inserts the service_requests row with Sprint 1.3 columns
 * 2. Invokes route-service-request edge function for CPP/vendor routing
 */
export async function submitServiceRequest(
  params: SubmitServiceRequestParams
): Promise<SubmitServiceRequestResult> {
  const {
    organizationId,
    locationId,
    vendorId,
    serviceCode,
    serviceConfigurationId,
    requestSubtype,
    currentCadenceDays,
    proposedCadenceDays,
    proposedVisitDate,
    notes,
    urgency = 'normal',
    requestType = 'scheduled',
    proposedSlots = [],
  } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // ── 1. Insert service request row ──────────────────────────────
  const insertPayload: Record<string, unknown> = {
    organization_id: organizationId,
    location_id: locationId || null,
    vendor_id: vendorId,
    requested_by: user.id,
    submitted_by_user_id: user.id,
    service_type: serviceCode,
    service_code: serviceCode,
    service_configuration_id: serviceConfigurationId || null,
    request_subtype: requestSubtype,
    request_type: requestType,
    urgency,
    notes: notes || null,
    current_cadence_days: currentCadenceDays ?? null,
    proposed_cadence_days: proposedCadenceDays ?? null,
    proposed_visit_date: proposedVisitDate || null,
    proposed_slot_1: proposedSlots[0] || null,
    proposed_slot_2: proposedSlots[1] || null,
    proposed_slot_3: proposedSlots[2] || null,
    status: 'pending_vendor',
  };

  const { data: request, error: insertErr } = await supabase
    .from('service_requests')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertErr || !request) {
    throw new Error(insertErr?.message || 'Failed to create service request');
  }

  // ── 2. Invoke route-service-request edge function ──────────────
  const { data: routeResult, error: routeErr } =
    await supabase.functions.invoke('route-service-request', {
      body: { request_id: request.id },
    });

  if (routeErr) {
    // Request was created but routing failed — return partial result
    return {
      request_id: request.id,
      routing_target: 'vendor_thread',
      status: 'pending_vendor',
      is_floor_breach: false,
    };
  }

  return {
    request_id: request.id,
    routing_target: routeResult.routing_target,
    status: routeResult.status,
    is_floor_breach: routeResult.is_floor_breach ?? false,
    email_sent: routeResult.email_sent,
    thread_id: routeResult.thread_id,
  };
}
