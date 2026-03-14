/**
 * Send Surveys — runs every 15 min via cron
 * Picks up pending surveys whose scheduled_send_at has passed and sends email/SMS.
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

    const now = new Date().toISOString();

    // Find surveys ready to send
    const { data: surveys, error } = await supabase
      .from('customer_surveys')
      .select('*, survey_settings!inner(*)') // join vendor settings
      .eq('status', 'pending')
      .lte('scheduled_send_at', now)
      .is('sent_at', null)
      .limit(50);

    if (error) throw error;
    if (!surveys || surveys.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    const baseUrl = Deno.env.get('SURVEY_BASE_URL') || 'https://web-vendor.vercel.app';

    for (const survey of surveys) {
      const surveyUrl = `${baseUrl}/survey/${survey.token}`;
      const settings = await getVendorSettings(supabase, survey.vendor_id);

      // Send email
      if (settings?.send_via_email && survey.recipient_email) {
        const subject = (settings.email_subject || 'How was your service?')
          .replace('{company_name}', 'HoodOps');

        await supabase.functions.invoke('send-email', {
          body: {
            to: survey.recipient_email,
            subject,
            html: buildSurveyEmail(survey, surveyUrl, settings),
          },
        });
      }

      // Update status
      await supabase
        .from('customer_surveys')
        .update({ status: 'sent', sent_at: now })
        .eq('id', survey.id);

      sentCount++;
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getVendorSettings(supabase: any, vendorId: string) {
  const { data } = await supabase
    .from('survey_settings')
    .select('*')
    .eq('vendor_id', vendorId)
    .single();
  return data;
}

function buildSurveyEmail(survey: any, surveyUrl: string, settings: any): string {
  const daysUntilExpiry = Math.ceil(
    (new Date(survey.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e4d6b; font-size: 24px; margin: 0;">HoodOps</h1>
      </div>
      <p style="color: #333; font-size: 16px;">Hi ${survey.recipient_name || 'there'},</p>
      <p style="color: #333; font-size: 16px;">Thank you for choosing HoodOps for your recent service. We'd love to hear about your experience!</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${surveyUrl}" style="display: inline-block; background: #1e4d6b; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">Rate Your Service</a>
      </div>
      <p style="color: #666; font-size: 14px;">It only takes 30 seconds. Your feedback helps us improve and reward our technicians.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">This survey expires in ${daysUntilExpiry} days.</p>
    </div>
  `;
}
