// ── generate-api-key — Create a new API key with SHA-256 hashing ───
// The raw key is returned ONCE in the response. Only the hash is stored.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

function generateRandomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get caller identity
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller profile for org_id + role check
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['platform_admin', 'owner_operator', 'executive'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { label, key_type = 'live', permissions = {}, facility_scope = 'all', expires_days = 365 } = body;

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Label is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate the raw key: evd_{type}_{48 random hex chars}
    const randomPart = generateRandomHex(24); // 24 bytes = 48 hex chars
    const rawKey = `evd_${key_type}_${randomPart}`;
    const keyHash = await sha256Hex(rawKey);
    const keyPreview = `evd_${key_type}_****${randomPart.slice(-4)}`;

    const expiresAt = new Date(Date.now() + expires_days * 86400000).toISOString();

    const { data: newKey, error: insertError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        org_id: profile.org_id,
        label: label.trim(),
        key_type,
        key_hash: keyHash,
        key_preview: keyPreview,
        permissions,
        facility_scope: typeof facility_scope === 'string' ? facility_scope : JSON.stringify(facility_scope),
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the full key ONCE — it will never be retrievable again
    return new Response(JSON.stringify({
      ...newKey,
      full_key: rawKey, // only time the raw key is exposed
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
