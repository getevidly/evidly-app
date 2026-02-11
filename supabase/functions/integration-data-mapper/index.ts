/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface MapRequest {
  platform_slug: string;
  entity_type: string;
  direction: 'to_evidly' | 'from_evidly';
  data: Record<string, unknown>;
}

// Platform-specific field mappings
const EMPLOYEE_MAPS: Record<string, Record<string, string>> = {
  toast: { guid: 'external_id', firstName: 'first_name', lastName: 'last_name', email: 'email', restaurantGuid: 'location_external_id', jobTitle: 'role' },
  square: { id: 'external_id', given_name: 'first_name', family_name: 'last_name', email_address: 'email', location_ids: 'location_external_ids' },
  adp: { workerID: 'external_id', 'person.legalName.givenName': 'first_name', 'person.legalName.familyName1': 'last_name', 'person.communication.email': 'email' },
  gusto: { id: 'external_id', first_name: 'first_name', last_name: 'last_name', email: 'email' },
};

const VENDOR_MAPS: Record<string, Record<string, string>> = {
  quickbooks: { Id: 'external_id', DisplayName: 'name', PrimaryEmailAddr: 'email', PrimaryPhone: 'phone' },
  xero: { ContactID: 'external_id', Name: 'name', EmailAddress: 'email' },
  restaurant365: { id: 'external_id', name: 'name', email: 'contact_email' },
};

function mapFields(data: Record<string, unknown>, fieldMap: Record<string, string>, reverse: boolean): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [externalKey, evidlyKey] of Object.entries(fieldMap)) {
    if (reverse) {
      if (data[evidlyKey] !== undefined) result[externalKey] = data[evidlyKey];
    } else {
      // Support nested keys like 'person.legalName.givenName'
      let val: unknown = data;
      for (const part of externalKey.split('.')) {
        val = (val as Record<string, unknown>)?.[part];
      }
      if (val !== undefined) result[evidlyKey] = val;
    }
  }
  return result;
}

Deno.serve(async (req: Request) => {
  const { platform_slug, entity_type, direction, data }: MapRequest = await req.json();

  let fieldMap: Record<string, string> | undefined;

  if (entity_type === 'employee') {
    fieldMap = EMPLOYEE_MAPS[platform_slug];
  } else if (entity_type === 'vendor') {
    fieldMap = VENDOR_MAPS[platform_slug];
  }

  if (!fieldMap) {
    return new Response(JSON.stringify({ error: `No mapping for ${platform_slug}/${entity_type}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const reverse = direction === 'from_evidly';
  const mapped = mapFields(data, fieldMap, reverse);

  return new Response(JSON.stringify({ mapped, platform_slug, entity_type, direction }), { headers: { 'Content-Type': 'application/json' } });
});
