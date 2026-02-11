/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PublishRequest {
  listing_id: string;
  action: 'submit_review' | 'approve' | 'reject' | 'suspend';
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { listing_id, action }: PublishRequest = await req.json();

  const { data: listing, error } = await supabase
    .from('api_marketplace_listings')
    .select('*, api_applications(organization_id, status)')
    .eq('id', listing_id)
    .single();

  if (error || !listing) {
    return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const validTransitions: Record<string, string[]> = {
    submit_review: ['draft'],
    approve: ['review'],
    reject: ['review'],
    suspend: ['published'],
  };

  if (!validTransitions[action]?.includes(listing.status)) {
    return new Response(JSON.stringify({ error: `Cannot ${action} a listing with status: ${listing.status}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validation for submit_review
  if (action === 'submit_review') {
    const errors: string[] = [];
    if (!listing.name || listing.name.length < 3) errors.push('Name must be at least 3 characters');
    if (!listing.description || listing.description.length < 20) errors.push('Description must be at least 20 characters');
    if (!listing.category) errors.push('Category is required');
    if (listing.api_applications.status !== 'active') errors.push('Associated API application must be active');

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: errors }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const statusMap: Record<string, string> = {
    submit_review: 'review',
    approve: 'published',
    reject: 'draft',
    suspend: 'suspended',
  };

  const updates: Record<string, unknown> = { status: statusMap[action] };
  if (action === 'approve') updates.published_at = new Date().toISOString();

  await supabase.from('api_marketplace_listings').update(updates).eq('id', listing_id);

  return new Response(JSON.stringify({
    success: true,
    listing_id,
    new_status: statusMap[action],
    action,
  }), { headers: { 'Content-Type': 'application/json' } });
});
