/**
 * api-v1-locations-services — Read-only API for EvidLY to fetch location service history.
 * GET /api/v1/locations/:evidly_location_id/services?from=DATE&to=DATE&type=CODE
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateApiKey, unauthorizedResponse, corsHeaders } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  if (!validateApiKey(req)) return unauthorizedResponse();

  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get('location_id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const typeCode = url.searchParams.get('type');

    if (!locationId) {
      return new Response(JSON.stringify({ error: 'location_id required' }), {
        status: 400, headers: corsHeaders(),
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let query = supabase
      .from('service_records')
      .select('*')
      .eq('location_id', locationId)
      .order('service_date', { ascending: false })
      .limit(50);

    if (from) query = query.gte('service_date', from);
    if (to) query = query.lte('service_date', to);
    if (typeCode) query = query.contains('service_type_codes', [typeCode]);

    const { data: records } = await query;

    const services = (records || []).map((r: any) => ({
      id: r.id,
      service_date: r.service_date,
      service_types: r.service_type_codes || [],
      technician: r.technician_name || null,
      condition_before: r.condition_before || null,
      condition_after: r.condition_after || null,
      duration_minutes: r.duration_minutes || null,
      certificate_id: r.certificate_id || null,
      certificate_url: r.certificate_url || null,
      photos: {
        before: r.photos_before || [],
        after: r.photos_after || [],
      },
      deficiencies_found: r.deficiency_count || 0,
      notes: r.notes || null,
    }));

    return new Response(JSON.stringify({
      location_id: locationId,
      services,
    }), { headers: corsHeaders() });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: corsHeaders(),
    });
  }
});
