/**
 * AI Estimate Submit — receives AI self-estimate submissions and creates service requests.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const {
      business_name, contact_name, contact_email, contact_phone,
      address, city, state, zip, service_types, preferred_date,
      preferred_time_window, notes, ai_analysis, referral_code,
    } = body;

    if (!contact_name || !contact_email) {
      throw new Error('contact_name and contact_email are required');
    }

    // Look up vendor (default vendor for now)
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .limit(1)
      .single();

    const vendorId = vendor?.id;
    if (!vendorId) throw new Error('No vendor configured');

    // Create service request with AI data
    const { data: request, error } = await supabase
      .from('service_requests')
      .insert({
        vendor_id: vendorId,
        source: 'ai_estimate',
        business_name,
        contact_name,
        contact_email,
        contact_phone,
        address,
        city,
        state,
        zip,
        service_types: service_types || [],
        preferred_date: preferred_date || null,
        preferred_time_window: preferred_time_window || 'anytime',
        notes,
        referral_code: referral_code || null,
        ai_estimate_data: ai_analysis || null,
        ai_estimated_price_low: ai_analysis?.price_range?.low || null,
        ai_estimated_price_high: ai_analysis?.price_range?.high || null,
        ai_estimated_hours: ai_analysis?.estimated_hours || null,
        ai_equipment_detected: ai_analysis?.equipment_detected || null,
        ai_condition_assessment: ai_analysis?.condition_assessment || null,
        ai_photos: ai_analysis?.photos || null,
        status: 'new',
      })
      .select('id')
      .single();

    if (error) throw error;

    // If referral code provided, link the referral
    if (referral_code) {
      const { data: code } = await supabase
        .from('referral_codes')
        .select('id, organization_id')
        .eq('code', referral_code)
        .eq('is_active', true)
        .single();

      if (code) {
        await supabase.from('referrals').insert({
          vendor_id: vendorId,
          referral_code_id: code.id,
          referrer_org_id: code.organization_id,
          referee_name: contact_name,
          referee_business_name: business_name,
          referee_email: contact_email,
          referee_phone: contact_phone,
          referee_address: [address, city, state, zip].filter(Boolean).join(', '),
          source: 'link',
          status: 'pending',
        });

        await supabase
          .from('referral_codes')
          .update({ total_referrals: code.total_referrals + 1 })
          .eq('id', code.id);
      }
    }

    return new Response(JSON.stringify({ success: true, request_id: request?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
