/**
 * api-v1-locations-schedule — Read-only API for EvidLY to fetch location schedule.
 * GET /api/v1/locations/:evidly_location_id/schedule
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

    // Upcoming scheduled jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, scheduled_date, service_type_codes, status')
      .eq('location_id', locationId)
      .gte('scheduled_date', new Date().toISOString().slice(0, 10))
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_date', { ascending: true })
      .limit(20);

    // Recurring schedules
    const { data: recurring } = await supabase
      .from('location_service_schedules')
      .select('service_type, service_type_code, frequency, next_due_date')
      .eq('location_id', locationId);

    return new Response(JSON.stringify({
      location_id: locationId,
      upcoming_services: (jobs || []).map((j: any) => ({
        job_id: j.id,
        scheduled_date: j.scheduled_date,
        service_types: j.service_type_codes || [],
        status: j.status,
      })),
      recurring_schedules: (recurring || []).map((r: any) => ({
        service_type: r.service_type,
        code: r.service_type_code,
        frequency: r.frequency,
        next_date: r.next_due_date,
      })),
    }), { headers: corsHeaders() });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: corsHeaders(),
    });
  }
});
