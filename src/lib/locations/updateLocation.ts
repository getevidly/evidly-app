// Canonical location update. Mirrors createLocation.ts pattern.
// Column contract verified against PROD information_schema on 2026-07-10.
// id and organization_id are NOT updatable — org_id is used as a scope filter.
// PROD Supabase: irxgmhxhmxtzfwuieblc

import { supabase } from '../supabase';

export interface UpdateLocationInput {
  name?: string;
  jurisdiction_id?: string | null;
  business_hours_timezone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  status?: string;
  kitchen_type?: string;
  cooking_type?: string;
  sb1383_tier?: string;
  k12_program?: boolean;
  k12_program_type?: string;
  business_hours_start?: string;
  business_hours_end?: string;
  business_hours_days?: string;
  region_id?: string;
  industry_segment?: string;
  site_contact_name?: string;
  site_contact_email?: string;
  site_contact_phone?: string;
  site_phone?: string;
  manager_name?: string;
  manager_phone?: string;
}

/**
 * Build a locations UPDATE payload from validated input.
 * Whitelist-only — unknown keys are impossible. Only keys explicitly
 * provided are included so unchanged columns stay untouched.
 */
export function buildUpdatePayload(input: UpdateLocationInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('updateLocation: name cannot be empty');
    payload.name = input.name.trim();
  }
  if (input.jurisdiction_id !== undefined) payload.jurisdiction_id = input.jurisdiction_id || null;
  if (input.business_hours_timezone !== undefined) payload.business_hours_timezone = input.business_hours_timezone;
  if (input.address !== undefined) payload.address = input.address;
  if (input.city !== undefined) payload.city = input.city;
  if (input.state !== undefined) payload.state = input.state;
  if (input.zip !== undefined) payload.zip = input.zip;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.status !== undefined) payload.status = input.status;
  if (input.kitchen_type !== undefined) payload.kitchen_type = input.kitchen_type;
  if (input.cooking_type !== undefined) payload.cooking_type = input.cooking_type;
  if (input.sb1383_tier !== undefined) payload.sb1383_tier = input.sb1383_tier;
  if (input.k12_program !== undefined) payload.k12_program = input.k12_program;
  if (input.k12_program_type !== undefined) payload.k12_program_type = input.k12_program_type;
  if (input.business_hours_start !== undefined) payload.business_hours_start = input.business_hours_start;
  if (input.business_hours_end !== undefined) payload.business_hours_end = input.business_hours_end;
  if (input.business_hours_days !== undefined) payload.business_hours_days = input.business_hours_days;
  if (input.region_id !== undefined) payload.region_id = input.region_id;
  if (input.industry_segment !== undefined) payload.industry_segment = input.industry_segment;
  if (input.site_contact_name !== undefined) payload.site_contact_name = input.site_contact_name;
  if (input.site_contact_email !== undefined) payload.site_contact_email = input.site_contact_email;
  if (input.site_contact_phone !== undefined) payload.site_contact_phone = input.site_contact_phone;
  if (input.site_phone !== undefined) payload.site_phone = input.site_phone;
  if (input.manager_name !== undefined) payload.manager_name = input.manager_name;
  if (input.manager_phone !== undefined) payload.manager_phone = input.manager_phone;

  if (Object.keys(payload).length === 0) {
    throw new Error('updateLocation: at least one field must be provided');
  }

  return payload;
}

/**
 * Update a single location by ID, scoped to organization_id.
 * Returns the updated row. Throws on validation or Supabase error.
 */
export async function updateLocation(id: string, orgId: string, input: UpdateLocationInput) {
  if (!id) throw new Error('updateLocation: id is required');
  if (!orgId) throw new Error('updateLocation: organization_id is required for scoping');

  const payload = buildUpdatePayload(input);

  const { data, error } = await supabase
    .from('locations')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
