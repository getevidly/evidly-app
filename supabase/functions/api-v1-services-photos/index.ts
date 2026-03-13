/**
 * api-v1-services-photos — Read-only API for EvidLY to fetch service photos.
 * GET /api/v1/services/:id/photos
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateApiKey, unauthorizedResponse, corsHeaders } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  if (!validateApiKey(req)) return unauthorizedResponse();

  try {
    const url = new URL(req.url);
    const serviceId = url.searchParams.get('service_id');

    if (!serviceId) {
      return new Response(JSON.stringify({ error: 'service_id required' }), {
        status: 400, headers: corsHeaders(),
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: photos } = await supabase
      .from('service_photos')
      .select('*')
      .eq('service_id', serviceId)
      .order('taken_at', { ascending: true });

    return new Response(JSON.stringify({
      service_id: serviceId,
      photos: (photos || []).map((p: any) => ({
        id: p.id,
        section: p.section,
        url: p.url,
        thumbnail_url: p.thumbnail_url || p.url,
        equipment: p.equipment_name || null,
        caption: p.caption || null,
        taken_at: p.taken_at,
      })),
    }), { headers: corsHeaders() });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: corsHeaders(),
    });
  }
});
