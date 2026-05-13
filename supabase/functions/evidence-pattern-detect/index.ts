import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders(null);

const SEED_PHRASES = [
  "hasn't arrived",
  "has not arrived",
  "broken",
  "doesn't work",
  "does not work",
  "missed deadline",
  "vendor late",
  "damaged",
  "expired",
  "overdue",
  "failed inspection",
];

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Auth: Bearer token must contain service_role_key
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader.includes(serviceKey)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // Get all threads grouped by org
  const { data: threads } = await supabase
    .from('onboarding_item_threads')
    .select('id, organization_id');

  if (!threads || threads.length === 0) {
    return jsonResponse({ processed: 0, signals: 0 });
  }

  const orgThreads = new Map<string, string[]>();
  for (const t of threads) {
    const list = orgThreads.get(t.organization_id) || [];
    list.push(t.id);
    orgThreads.set(t.organization_id, list);
  }

  let signalsUpserted = 0;

  for (const [orgId, threadIds] of orgThreads) {
    const { data: messages } = await supabase
      .from('onboarding_item_thread_messages')
      .select('thread_id, body')
      .in('thread_id', threadIds)
      .gte('created_at', sixtyDaysAgo);

    if (!messages || messages.length === 0) continue;

    for (const phrase of SEED_PHRASES) {
      const matchingThreadIds = new Set<string>();
      for (const msg of messages) {
        if (msg.body.toLowerCase().includes(phrase)) {
          matchingThreadIds.add(msg.thread_id);
        }
      }

      if (matchingThreadIds.size >= 3) {
        const arr = Array.from(matchingThreadIds);
        const { data: existing } = await supabase
          .from('evidence_signals')
          .select('id')
          .eq('organization_id', orgId)
          .eq('pattern_text', phrase)
          .maybeSingle();

        if (existing) {
          await supabase.from('evidence_signals')
            .update({
              thread_ids: arr,
              last_seen_at: new Date().toISOString(),
              dashboard_visible: true,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('evidence_signals')
            .insert({
              organization_id: orgId,
              pattern_text: phrase,
              thread_ids: arr,
            });
        }
        signalsUpserted++;
      }
    }
  }

  return jsonResponse({ processed: orgThreads.size, signals: signalsUpserted });
});
