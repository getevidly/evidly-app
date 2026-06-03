// Canonical location creation. The ONLY permitted way to INSERT into locations.
// Column contract verified against PROD information_schema on 2026-06-03.
// jurisdiction_id is REQUIRED — every location must be bound to its governing
// jurisdiction at creation time. The only exception is POS-synced locations
// (edge function), which cannot use this helper and handle the column directly.
// PROD Supabase: irxgmhxhmxtzfwuieblc

import { supabase } from '../supabase';

export interface CreateLocationInput {
  organization_id: string;
  name: string;
  jurisdiction_id: string;
  business_hours_timezone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  status?: string;
  kitchen_type?: string;
  sb1383_tier?: string;
  k12_program?: boolean;
  k12_program_type?: string;
  business_hours_start?: string;
  business_hours_end?: string;
  business_hours_days?: string;
  region_id?: string;
  site_contact_name?: string;
  site_contact_email?: string;
  site_contact_phone?: string;
  site_phone?: string;
  manager_name?: string;
  manager_phone?: string;
}

/**
 * Build a locations INSERT payload from validated input.
 * Whitelist-only — unknown keys are impossible. Undefined values are stripped
 * so DB defaults apply. Exported separately for unit-testability and reuse
 * by the POS sync edge function (which cannot import from src/).
 */
export function buildLocationPayload(input: CreateLocationInput): Record<string, unknown> {
  if (!input.organization_id) {
    throw new Error('createLocation: organization_id is required');
  }
  if (!input.name || !input.name.trim()) {
    throw new Error('createLocation: name is required');
  }
  if (!input.jurisdiction_id || !input.jurisdiction_id.trim()) {
    throw new Error('jurisdiction_id is required — locations cannot be created without a governing jurisdiction.');
  }

  const payload: Record<string, unknown> = {
    organization_id: input.organization_id,
    name: input.name.trim(),
    jurisdiction_id: input.jurisdiction_id,
    business_hours_timezone: input.business_hours_timezone || 'America/Los_Angeles',
  };

  // Optional columns — only include if provided (let DB defaults apply otherwise)
  if (input.address !== undefined) payload.address = input.address;
  if (input.city !== undefined) payload.city = input.city;
  if (input.state !== undefined) payload.state = input.state;
  if (input.zip !== undefined) payload.zip = input.zip;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.status !== undefined) payload.status = input.status;
  if (input.kitchen_type !== undefined) payload.kitchen_type = input.kitchen_type;
  if (input.sb1383_tier !== undefined) payload.sb1383_tier = input.sb1383_tier;
  if (input.k12_program !== undefined) payload.k12_program = input.k12_program;
  if (input.k12_program_type !== undefined) payload.k12_program_type = input.k12_program_type;
  if (input.business_hours_start !== undefined) payload.business_hours_start = input.business_hours_start;
  if (input.business_hours_end !== undefined) payload.business_hours_end = input.business_hours_end;
  if (input.business_hours_days !== undefined) payload.business_hours_days = input.business_hours_days;
  if (input.region_id !== undefined) payload.region_id = input.region_id;
  if (input.site_contact_name !== undefined) payload.site_contact_name = input.site_contact_name;
  if (input.site_contact_email !== undefined) payload.site_contact_email = input.site_contact_email;
  if (input.site_contact_phone !== undefined) payload.site_contact_phone = input.site_contact_phone;
  if (input.site_phone !== undefined) payload.site_phone = input.site_phone;
  if (input.manager_name !== undefined) payload.manager_name = input.manager_name;
  if (input.manager_phone !== undefined) payload.manager_phone = input.manager_phone;

  return payload;
}

/**
 * Insert a single location into the locations table.
 * Returns the created row. Throws on validation or Supabase error.
 */
export async function createLocation(input: CreateLocationInput) {
  const payload = buildLocationPayload(input);

  const { data, error } = await supabase
    .from('locations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
