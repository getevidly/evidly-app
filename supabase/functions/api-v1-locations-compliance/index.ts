/**
 * api-v1-locations-compliance — Read-only API for EvidLY to fetch location compliance status.
 * GET /api/v1/locations/:evidly_location_id/compliance
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
      return new Response(JSON.stringify({ error: 'location_id query parameter required' }), {
        status: 400, headers: corsHeaders(),
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch service schedules for the location
    const { data: schedules } = await supabase
      .from('location_service_schedules')
      .select('*')
      .eq('location_id', locationId);

    // Fetch open deficiencies count
    const { count: openDeficiencies } = await supabase
      .from('deficiencies')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .in('status', ['open', 'in_progress']);

    const services = (schedules || []).map((s: any) => ({
      service_type: s.service_type,
      code: s.service_type_code,
      last_service_date: s.last_service_date,
      next_due_date: s.next_due_date,
      frequency: s.frequency,
      status: getComplianceStatus(s.next_due_date),
      condition: s.last_condition || 'unknown',
    }));

    const overallStatus = services.some((s: any) => s.status === 'overdue')
      ? 'overdue'
      : services.some((s: any) => s.status === 'due_soon')
        ? 'due_soon'
        : 'compliant';

    return new Response(JSON.stringify({
      location_id: locationId,
      services,
      open_deficiencies: openDeficiencies || 0,
      overall_status: overallStatus,
    }), { headers: corsHeaders() });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: corsHeaders(),
    });
  }
});

function getComplianceStatus(nextDueDate: string | null): string {
  if (!nextDueDate) return 'unknown';
  const diff = new Date(nextDueDate).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 30 * 86400000) return 'due_soon';
  return 'compliant';
}
