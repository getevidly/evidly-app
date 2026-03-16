/**
 * EvidLY Referral Signup — tracks when someone signs up via referral code.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';

const corsHeaders = PUBLIC_CORS_HEADERS;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const { allowed } = await checkRateLimit({
      key: `referral_signup:${clientIp}`,
      maxRequests: 5,
      windowSeconds: 3600,
      supabase,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { referral_code, business_name, contact_name, contact_email, contact_phone } = body;

    if (!referral_code) throw new Error('referral_code is required');

    // Find the referral code
    const { data: code, error: codeErr } = await supabase
      .from('referral_codes')
      .select('id, vendor_id, organization_id')
      .eq('code', referral_code)
      .eq('is_active', true)
      .single();

    if (codeErr || !code) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive referral code' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referral_code_id', code.id)
      .eq('referee_email', contact_email)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ success: true, referral_id: existing.id, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create referral record
    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        vendor_id: code.vendor_id,
        referral_code_id: code.id,
        referrer_org_id: code.organization_id,
        referee_name: contact_name || business_name || 'Unknown',
        referee_business_name: business_name,
        referee_email: contact_email,
        referee_phone: contact_phone,
        source: 'link',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;

    // Increment total referrals
    await supabase.rpc('increment_referral_count', { code_id: code.id });

    return new Response(JSON.stringify({ success: true, referral_id: referral?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
