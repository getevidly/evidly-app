import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: 'report_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch report with all related data
    const { data: report, error: reportError } = await supabase
      .from('service_reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found');
    }

    // Check signatures are present
    if (!report.lead_tech_signature_url || !report.customer_signature_url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Both lead tech and customer signatures required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already notified
    if (report.qa_notification_sent) {
      return new Response(JSON.stringify({
        success: true,
        message: 'QA notification already sent',
        already_sent: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch deficiencies for the report
    const { data: deficiencies } = await supabase
      .from('report_deficiencies')
      .select('component, field, deficiency_text, severity')
      .eq('report_id', report_id);

    const deficiencyCount = deficiencies?.length || 0;
    const deficiencyList = deficiencies && deficiencies.length > 0
      ? deficiencies.map((d: any) => `• ${d.component}: ${d.deficiency_text} [${d.severity}]`).join('\n')
      : 'None';

    // Fetch systems count
    const { count: systemsCount } = await supabase
      .from('report_systems')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', report_id);

    // Fetch photos count
    const { count: photosCount } = await supabase
      .from('report_photos')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', report_id);

    // Build QA review email
    const serviceDate = new Date(report.service_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const emailBody = `A new service report requires QA review.

Certificate ID: ${report.certificate_id}
Customer: ${report.customer_name || 'Unknown'}
Service Date: ${serviceDate}
Service Type: ${report.service_type}
Frequency: ${report.frequency}

Systems Inspected: ${systemsCount || 0}
Photos Captured: ${photosCount || 0}

Deficiencies Found: ${deficiencyCount}
${deficiencyList}

Review Report: https://web-vendor.vercel.app/qa/${report_id}

This report is pending your approval before it can be sent to the customer.

---
Cleaning Pros Plus LLC
(209) 636-6116`;

    const emailSubject = `QA Review Required: ${report.customer_name || 'Customer'} - ${report.certificate_id}`;

    // Queue email
    const { error: emailError } = await supabase.from('email_queue').insert({
      to_email: 'compliance@cprosplus.com',
      to_name: 'QA Review Team',
      subject: emailSubject,
      body: emailBody,
      template: 'qa_review_notification',
      metadata: {
        report_id,
        certificate_id: report.certificate_id,
        customer_name: report.customer_name,
        service_type: report.service_type,
        deficiency_count: deficiencyCount,
      },
    });

    if (emailError) {
      console.error('Failed to queue QA email:', emailError);
      // Don't fail the whole request - still mark as notified
    }

    // Update report to mark as notified
    const { error: updateError } = await supabase
      .from('service_reports')
      .update({
        qa_notification_sent: true,
        qa_notified_at: new Date().toISOString(),
        overall_status: 'completed',
        qa_status: 'pending',
      })
      .eq('id', report_id);

    if (updateError) {
      console.error('Failed to update report:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'QA notification sent to compliance@cprosplus.com',
      certificate_id: report.certificate_id,
      deficiency_count: deficiencyCount,
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
