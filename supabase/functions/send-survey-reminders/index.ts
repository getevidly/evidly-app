/**
 * Send Survey Reminders — runs daily at 9 AM
 * Sends a reminder for surveys that were sent X days ago but not completed.
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

    const now = new Date();
    const baseUrl = Deno.env.get('SURVEY_BASE_URL') || 'https://web-vendor.vercel.app';

    // Get all vendors with active survey settings
    const { data: allSettings } = await supabase
      .from('survey_settings')
      .select('vendor_id, reminder_days, send_via_email')
      .eq('is_active', true);

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ reminded: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let remindedCount = 0;

    for (const settings of allSettings) {
      const reminderCutoff = new Date(now.getTime() - (settings.reminder_days || 3) * 24 * 60 * 60 * 1000);

      const { data: surveys } = await supabase
        .from('customer_surveys')
        .select('*')
        .eq('vendor_id', settings.vendor_id)
        .eq('status', 'sent')
        .is('completed_at', null)
        .is('reminder_sent_at', null)
        .lte('sent_at', reminderCutoff.toISOString())
        .gte('expires_at', now.toISOString());

      if (!surveys || surveys.length === 0) continue;

      for (const survey of surveys) {
        if (settings.send_via_email && survey.recipient_email) {
          const surveyUrl = `${baseUrl}/survey/${survey.token}`;
          const daysUntilExpiry = Math.ceil(
            (new Date(survey.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          await supabase.functions.invoke('send-email', {
            body: {
              to: survey.recipient_email,
              subject: "We'd still love your feedback!",
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1e4d6b; font-size: 24px; margin: 0;">HoodOps</h1>
                  </div>
                  <p style="color: #333; font-size: 16px;">Hi ${survey.recipient_name || 'there'},</p>
                  <p style="color: #333; font-size: 16px;">We noticed you haven't had a chance to rate your recent service. Your feedback means a lot to us!</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${surveyUrl}" style="display: inline-block; background: #1e4d6b; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">Rate Your Service</a>
                  </div>
                  <p style="color: #666; font-size: 14px;">It only takes 30 seconds.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                  <p style="color: #999; font-size: 12px; text-align: center;">This survey expires in ${daysUntilExpiry} days.</p>
                </div>
              `,
            },
          });
        }

        await supabase
          .from('customer_surveys')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', survey.id);

        remindedCount++;
      }
    }

    return new Response(JSON.stringify({ reminded: remindedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
