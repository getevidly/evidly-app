import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtinguisherObservation {
  location: string;
  type: string;
  size: string;
  condition: string;
  tag_current: boolean;
  expiry: string;
}

interface CourtesyReportPayload {
  report_id: string;
  // Suppression
  suppression_company_name: string;
  suppression_company_email: string;
  suppression_nozzle_caps: string;
  suppression_nozzles_clean: string;
  suppression_inspection_current: string;
  suppression_notes: string | null;
  // Extinguisher
  extinguisher_company_name: string;
  extinguisher_company_email: string;
  extinguishers: ExtinguisherObservation[];
  // Context
  customer_name: string;
  service_date: string;
  tech_name: string;
  tech_cert: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: CourtesyReportPayload = await req.json();
    const results: { suppression: boolean; extinguisher: boolean } = {
      suppression: false,
      extinguisher: false,
    };

    // --- Send suppression company email ---
    if (payload.suppression_company_email) {
      const hasIssues = payload.suppression_inspection_current === 'No'
        || payload.suppression_nozzle_caps === 'No'
        || payload.suppression_nozzles_clean === 'No';

      const suppressionBody = `Dear ${payload.suppression_company_name || 'Fire Suppression Provider'},

During our kitchen exhaust cleaning at ${payload.customer_name} on ${payload.service_date}, we observed the following regarding your suppression system:

- Nozzle Caps: ${payload.suppression_nozzle_caps}
- Nozzles Clean: ${payload.suppression_nozzles_clean}
- Inspection Current: ${payload.suppression_inspection_current}${hasIssues ? ' ⚠️' : ''}
${payload.suppression_notes ? `- Notes: ${payload.suppression_notes}` : ''}

This is a courtesy notification only. We did not service, test, or modify this system in any way.

Regards,
${payload.tech_name} (${payload.tech_cert})
Cleaning Pros Plus LLC
(209) 636-6116`;

      const subject = `Courtesy Fire Safety Observation - ${payload.customer_name}`;

      // Use Supabase edge function or Resend to send email
      // For now, log and store in DB
      const { error: emailError } = await supabase.from('email_queue').insert({
        to_email: payload.suppression_company_email,
        to_name: payload.suppression_company_name,
        subject,
        body: suppressionBody,
        template: 'fire_courtesy_suppression',
        metadata: {
          report_id: payload.report_id,
          customer_name: payload.customer_name,
          type: 'suppression',
        },
      });

      results.suppression = !emailError;
    }

    // --- Send extinguisher company email ---
    if (payload.extinguisher_company_email && payload.extinguishers?.length > 0) {
      const extinguisherLines = payload.extinguishers.map(ext => {
        const expired = new Date(ext.expiry) < new Date();
        const tagStatus = ext.tag_current ? 'Current' : 'Expired ⚠️';
        return `- ${ext.location}: ${ext.type} (${ext.size}) — ${expired ? 'Expired ⚠️' : tagStatus}`;
      }).join('\n');

      const extinguisherBody = `Dear ${payload.extinguisher_company_name || 'Fire Extinguisher Provider'},

During our kitchen exhaust cleaning at ${payload.customer_name} on ${payload.service_date}, we observed the following fire extinguishers:

${extinguisherLines}

This is a courtesy notification only. We did not service, test, or modify any extinguishers.

Regards,
${payload.tech_name} (${payload.tech_cert})
Cleaning Pros Plus LLC
(209) 636-6116`;

      const subject = `Courtesy Fire Extinguisher Observation - ${payload.customer_name}`;

      const { error: emailError } = await supabase.from('email_queue').insert({
        to_email: payload.extinguisher_company_email,
        to_name: payload.extinguisher_company_name,
        subject,
        body: extinguisherBody,
        template: 'fire_courtesy_extinguisher',
        metadata: {
          report_id: payload.report_id,
          customer_name: payload.customer_name,
          type: 'extinguisher',
        },
      });

      results.extinguisher = !emailError;
    }

    // --- Update report_fire_safety record ---
    await supabase.from('report_fire_safety').update({
      courtesy_report_sent: true,
      courtesy_report_sent_at: new Date().toISOString(),
    }).eq('report_id', payload.report_id);

    return new Response(JSON.stringify({
      success: true,
      results,
      message: 'Courtesy reports queued for delivery',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
