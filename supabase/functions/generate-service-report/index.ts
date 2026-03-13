/**
 * generate-service-report — Generates a detailed after-service report PDF.
 * POST with { service_id }
 *
 * Returns: { report_url }
 *
 * Note: Full PDF generation requires a Deno PDF library (e.g., pdf-lib).
 * This is a scaffold that gathers report data and returns metadata.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { service_id } = await req.json();

    if (!service_id) {
      return new Response(JSON.stringify({ error: 'service_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch service record with related data
    const { data: service, error: svcErr } = await supabase
      .from('service_records')
      .select('*')
      .eq('id', service_id)
      .single();

    if (svcErr || !service) {
      return new Response(JSON.stringify({ error: 'Service record not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch photos
    const { data: photos } = await supabase
      .from('service_photos')
      .select('*')
      .eq('service_id', service_id)
      .order('taken_at', { ascending: true });

    // Fetch deficiencies found during this service
    const { data: deficiencies } = await supabase
      .from('deficiencies')
      .select('*')
      .eq('service_id', service_id);

    // Compile report data
    const reportData = {
      service,
      photos: photos || [],
      deficiencies: deficiencies || [],
      generated_at: new Date().toISOString(),
    };

    // TODO: Generate actual PDF with pdf-lib, upload to Supabase Storage.
    // For now, return the compiled report data.

    return new Response(JSON.stringify({
      service_id,
      report_data: reportData,
      report_url: null,
      message: 'Service report data compiled. PDF generation pending.',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
