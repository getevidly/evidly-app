import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

let corsHeaders = getCorsHeaders(null);

/**
 * ops-intelligence-coach — SP8 AI Coach
 *
 * Reads active insights for an org, calls Claude API for a one-sentence
 * weekly recommendation, stores in metadata.coach_recommendation on the
 * latest insight row. Falls back to highest-priority insight title.
 *
 * Input: { organization_id } or cron (all active orgs).
 */

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let orgIds: string[] = [];
    let body: { organization_id?: string } = {};

    try { body = await req.json(); } catch { /* cron — no body */ }

    if (body.organization_id) {
      orgIds = [body.organization_id];
    } else {
      const { data: orgs } = await supabase.from('organizations').select('id');
      orgIds = (orgs || []).map((o: { id: string }) => o.id);
    }

    let coachCount = 0;

    for (const orgId of orgIds) {
      // Get active insights for this org
      const { data: insights } = await supabase
        .from('ops_intelligence_insights')
        .select('id, priority, category, title, body')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('priority', { ascending: true })
        .limit(10);

      if (!insights || insights.length === 0) continue;

      let recommendation: string;

      if (anthropicKey) {
        // Build prompt from active insights
        const insightSummary = insights
          .map((i: { priority: number; title: string; body: string }, idx: number) =>
            `${idx + 1}. [P${i.priority}] ${i.title}: ${i.body}`)
          .join('\n');

        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 150,
              messages: [{
                role: 'user',
                content: `You are a food safety operations coach for a commercial kitchen. Based on these operational insights, give ONE actionable sentence (max 30 words) for what the team should focus on this week. Be specific and practical — no fluff.\n\nInsights:\n${insightSummary}`,
              }],
            }),
          });

          if (response.ok) {
            const result = await response.json();
            recommendation = result.content?.[0]?.text || insights[0].title;
          } else {
            recommendation = insights[0].title;
          }
        } catch {
          recommendation = insights[0].title;
        }
      } else {
        // Fallback: highest-priority insight title
        recommendation = insights[0].title;
      }

      // Store coach recommendation on the most recent insight
      const latestId = insights[0].id;
      await supabase
        .from('ops_intelligence_insights')
        .update({
          metadata: {
            ...(insights[0] as Record<string, unknown>).metadata,
            coach_recommendation: recommendation,
            coach_generated_at: new Date().toISOString(),
          },
        })
        .eq('id', latestId);

      coachCount++;
    }

    return jsonResponse({
      success: true,
      orgs_coached: coachCount,
    });
  } catch (err) {
    console.error('[ops-intelligence-coach]', err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
