/**
 * EvidLY Service Request — receives service requests from EvidLY client app.
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

    const body = await req.json();
    const { location_id, organization_id, service_types, urgency, preferred_date, notes } = body;

    if (!location_id || !organization_id) {
      throw new Error('location_id and organization_id are required');
    }

    // Look up vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .limit(1)
      .single();

    const vendorId = vendor?.id;
    if (!vendorId) throw new Error('No vendor configured');

    // Get location details
    const { data: location } = await supabase
      .from('locations')
      .select('name, address, contact_name, contact_email, contact_phone')
      .eq('id', location_id)
      .single();

    // Create service request
    const { data: request, error } = await supabase
      .from('service_requests')
      .insert({
        vendor_id: vendorId,
        source: 'evidly',
        evidly_location_id: location_id,
        organization_id,
        location_id,
        business_name: location?.name || null,
        contact_name: location?.contact_name || null,
        contact_email: location?.contact_email || null,
        contact_phone: location?.contact_phone || null,
        address: location?.address || null,
        service_types: service_types || [],
        urgency: urgency || 'normal',
        preferred_date: preferred_date || null,
        notes,
        status: 'new',
      })
      .select('id')
      .single();

    if (error) throw error;

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
