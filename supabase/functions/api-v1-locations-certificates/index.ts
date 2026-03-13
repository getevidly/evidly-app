/**
 * api-v1-locations-certificates — Read-only API for EvidLY to fetch location certificates.
 * GET /api/v1/locations/:evidly_location_id/certificates
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

    if (!locationId) {
      return new Response(JSON.stringify({ error: 'location_id required' }), {
        status: 400, headers: corsHeaders(),
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: certs } = await supabase
      .from('certificates')
      .select('*')
      .eq('location_id', locationId)
      .order('issued_at', { ascending: false })
      .limit(50);

    return new Response(JSON.stringify({
      location_id: locationId,
      certificates: (certs || []).map((c: any) => ({
        id: c.id,
        certificate_number: c.certificate_number,
        service_date: c.service_date,
        service_types: c.service_type_codes || [],
        issued_at: c.issued_at,
        pdf_url: c.pdf_url || null,
        next_due_date: c.next_due_date || null,
      })),
    }), { headers: corsHeaders() });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: corsHeaders(),
    });
  }
});
