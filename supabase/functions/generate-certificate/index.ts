/**
 * generate-certificate — Generates a service completion certificate PDF.
 * POST with { service_id }
 *
 * Returns: { certificate_id, pdf_url }
 *
 * Note: Full PDF generation requires a Deno PDF library (e.g., pdf-lib).
 * This is a scaffold that creates the certificate record and returns metadata.
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

    // Fetch service record
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

    // Generate certificate number
    const certNumber = `CERT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Insert certificate record
    const { data: cert, error: certErr } = await supabase
      .from('certificates')
      .insert({
        certificate_number: certNumber,
        service_id: service.id,
        location_id: service.location_id,
        vendor_id: service.vendor_id,
        service_date: service.service_date,
        service_type_codes: service.service_type_codes || [],
        technician_name: service.technician_name,
        condition_before: service.condition_before,
        condition_after: service.condition_after,
        issued_at: new Date().toISOString(),
        next_due_date: service.next_due_date,
        // pdf_url will be updated once PDF is generated and uploaded
        pdf_url: null,
      })
      .select()
      .single();

    if (certErr) {
      return new Response(JSON.stringify({ error: certErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: Generate actual PDF with pdf-lib, upload to Supabase Storage,
    // update cert.pdf_url. For now, return the certificate metadata.

    return new Response(JSON.stringify({
      certificate_id: cert.id,
      certificate_number: certNumber,
      pdf_url: cert.pdf_url,
      message: 'Certificate record created. PDF generation pending.',
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
