/**
 * Schedule Survey — triggered when job status → completed
 * Creates a customer_surveys record with scheduled send time.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { job_id } = await req.json();
    if (!job_id) throw new Error('job_id required');

    // Fetch job details
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, vendor_id, organization_id, location_id, completed_at')
      .eq('id', job_id)
      .single();
    if (jobErr || !job) throw new Error(`Job not found: ${jobErr?.message}`);

    // Fetch vendor survey settings
    const { data: settings } = await supabase
      .from('survey_settings')
      .select('*')
      .eq('vendor_id', job.vendor_id)
      .eq('is_active', true)
      .single();
    if (!settings) {
      return new Response(JSON.stringify({ skipped: true, reason: 'surveys_not_configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch location contact info
    const { data: location } = await supabase
      .from('locations')
      .select('contact_email, contact_phone, contact_name, timezone')
      .eq('id', job.location_id)
      .single();

    // Calculate send time
    const completedAt = new Date(job.completed_at || new Date());
    const sendAt = new Date(completedAt.getTime() + (settings.send_delay_hours || 24) * 60 * 60 * 1000);
    const expiresAt = new Date(sendAt.getTime() + (settings.expiry_days || 7) * 24 * 60 * 60 * 1000);

    // Create survey record
    const { data: survey, error: insertErr } = await supabase
      .from('customer_surveys')
      .insert({
        vendor_id: job.vendor_id,
        job_id: job.id,
        organization_id: job.organization_id,
        location_id: job.location_id,
        recipient_email: location?.contact_email || null,
        recipient_phone: location?.contact_phone || null,
        recipient_name: location?.contact_name || null,
        scheduled_send_at: sendAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select('id, token')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return new Response(JSON.stringify({ skipped: true, reason: 'survey_already_exists' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw insertErr;
    }

    return new Response(JSON.stringify({ success: true, survey_id: survey?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
