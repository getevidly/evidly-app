/**
 * Survey Alert — triggered when a low-rating survey is submitted
 * Sends email alert to owner/supervisors.
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

    const { survey_id } = await req.json();
    if (!survey_id) throw new Error('survey_id required');

    // Fetch survey with related data
    const { data: survey, error } = await supabase
      .from('customer_surveys')
      .select('*')
      .eq('id', survey_id)
      .single();
    if (error || !survey) throw new Error('Survey not found');

    // Get vendor settings
    const { data: settings } = await supabase
      .from('survey_settings')
      .select('auto_respond_enabled, auto_respond_threshold, auto_respond_recipients')
      .eq('vendor_id', survey.vendor_id)
      .single();

    if (!settings?.auto_respond_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'auto_respond_disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const threshold = settings.auto_respond_threshold || 3;
    if ((survey.overall_rating || 5) > threshold) {
      return new Response(JSON.stringify({ skipped: true, reason: 'rating_above_threshold' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send alert to recipients
    const recipients = settings.auto_respond_recipients || [];
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = Deno.env.get('SURVEY_BASE_URL') || 'https://web-vendor.vercel.app';

    for (const email of recipients) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `Low Rating Alert: ${survey.overall_rating} stars from ${survey.recipient_name || 'Customer'}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h2 style="color: #991B1B; margin: 0 0 8px 0; font-size: 18px;">Low Rating Alert</h2>
                <p style="color: #991B1B; margin: 0; font-size: 14px;">A customer submitted a ${survey.overall_rating}-star rating.</p>
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px 0; color: #666; width: 120px;">Customer</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${survey.recipient_name || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Rating</td><td style="padding: 8px 0; color: #DC2626; font-weight: 600;">${survey.overall_rating}/5 stars</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Feedback</td><td style="padding: 8px 0; color: #333;">${survey.feedback_text || 'No comment provided'}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Contact</td><td style="padding: 8px 0; color: #333;">${survey.recipient_email || ''} ${survey.recipient_phone || ''}</td></tr>
              </table>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${baseUrl}/surveys/${survey.id}" style="display: inline-block; background: #1e4d6b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">View Survey Details</a>
              </div>
              <p style="color: #DC2626; font-size: 14px; font-weight: 600; text-align: center;">Action required: Please follow up with the customer.</p>
            </div>
          `,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, alerted: recipients.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
