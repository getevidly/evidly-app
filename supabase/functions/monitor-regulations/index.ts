import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * monitor-regulations — AI-Powered Regulatory Change Analysis (Task #48, Roadmap #6)
 *
 * Phase 1: Admin-assisted workflow
 *   - Arthur pastes raw regulatory text + selects source
 *   - Claude generates plain-English summary, impact, action items
 *   - Admin reviews/edits before publishing to affected customers
 *
 * Phase 2 (future): Automated web scraping of regulatory source URLs
 *
 * Endpoints:
 *   POST /analyze  — Analyze raw regulatory text with Claude
 *   POST /publish  — Publish a reviewed change to affected locations
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user?.email?.endsWith("@getevidly.com")) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }
    }

    const body = await req.json();
    const action = body.action || "analyze";

    // ═══ ANALYZE: Generate AI summary from raw regulatory text ═══
    if (action === "analyze") {
      if (!anthropicKey) {
        return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);
      }

      const { sourceId, rawChangeText, changeType } = body;

      if (!sourceId || !rawChangeText || !changeType) {
        return jsonResponse(
          { error: "Missing required fields: sourceId, rawChangeText, changeType" },
          400
        );
      }

      // Get source details
      const { data: source } = await supabase
        .from("regulatory_sources")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (!source) {
        return jsonResponse({ error: "Source not found" }, 404);
      }

      // Call Claude to analyze the change
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1500,
          system: `You are a commercial kitchen compliance expert working for EvidLY.
Your job is to translate regulatory changes into plain-English alerts for kitchen operators.

For each change, provide:
1. A clear title (under 80 characters)
2. A plain-English summary (2-3 sentences, no legal jargon)
3. Specific impact: what does the operator need to DO differently?
4. Impact level: 'critical' (must act immediately), 'moderate' (action needed within 30 days), or 'informational' (awareness only)
5. Which compliance pillars are affected: facility_safety, food_safety, vendor_compliance
6. Which equipment types are affected (if any): hood, exhaust_fan, grease_trap, fire_suppression, fire_extinguisher, cooler, freezer
7. Which states are affected (2-letter codes, or null for federal/industry)
8. Effective date if mentioned (YYYY-MM-DD format)

RESPOND ONLY WITH VALID JSON:
{
  "title": "string",
  "summary": "string",
  "impact_description": "string",
  "impact_level": "critical | moderate | informational",
  "affected_pillars": ["string"],
  "affected_equipment_types": ["string"],
  "affected_states": ["string"] or null,
  "effective_date": "YYYY-MM-DD" or null
}`,
          messages: [
            {
              role: "user",
              content: `Regulatory source: ${source.code_name} (${source.issuing_body})
Jurisdiction: ${source.jurisdiction_type}${source.jurisdiction_code ? ` — ${source.jurisdiction_code}` : ""}
Change type: ${changeType}

Raw text of the change:
${rawChangeText}`,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text().catch(() => "Unknown AI error");
        return jsonResponse({ error: `AI analysis failed: ${errText}` }, 502);
      }

      const aiData = await aiResponse.json();
      const responseText = aiData.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

      const cleaned = responseText.replace(/```json|```/g, "").trim();
      const analysis = JSON.parse(cleaned);

      // Store the change as draft (unpublished, needs admin review)
      const { data: change, error: insertError } = await supabase
        .from("regulatory_changes")
        .insert({
          source_id: sourceId,
          change_type: changeType,
          title: analysis.title,
          summary: analysis.summary,
          impact_description: analysis.impact_description,
          impact_level: analysis.impact_level,
          affected_pillars: analysis.affected_pillars || [],
          affected_equipment_types: analysis.affected_equipment_types || [],
          affected_states: analysis.affected_states,
          effective_date: analysis.effective_date,
          raw_input_text: rawChangeText,
          ai_generated: true,
          published: false,
        })
        .select()
        .single();

      if (insertError) {
        return jsonResponse({ error: insertError.message }, 500);
      }

      // Update source last_checked timestamp
      await supabase
        .from("regulatory_sources")
        .update({ last_checked: new Date().toISOString() })
        .eq("id", sourceId);

      return jsonResponse({
        success: true,
        change,
        analysis,
      });
    }

    // ═══ PUBLISH: Push reviewed change to affected customers ═══
    if (action === "publish") {
      const { changeId } = body;

      if (!changeId) {
        return jsonResponse({ error: "Missing changeId" }, 400);
      }

      const { data: change } = await supabase
        .from("regulatory_changes")
        .select("*, regulatory_sources(*)")
        .eq("id", changeId)
        .single();

      if (!change) {
        return jsonResponse({ error: "Change not found" }, 404);
      }

      if (change.published) {
        return jsonResponse({ error: "Change already published" }, 400);
      }

      // Find affected locations
      let locQuery = supabase
        .from("locations")
        .select("id, organization_id, state, name")
        .eq("active", true);

      if (change.affected_states && change.affected_states.length > 0) {
        locQuery = locQuery.in("state", change.affected_states);
      }
      // Federal/industry changes go to all locations (no state filter)

      const { data: locations } = await locQuery;
      const affectedLocations = locations || [];

      // Phase 3 (V8 fix): write to intelligence_insights instead of ai_insights
      if (affectedLocations.length > 0) {
        const insights = affectedLocations.map((loc: any) => ({
          organization_id: loc.organization_id,
          source_type: "regulatory_monitor",
          category: "regulatory_change",
          impact_level: change.impact_level === "critical" ? "critical"
            : change.impact_level === "moderate" ? "medium" : "low",
          urgency: change.impact_level === "critical" ? "immediate" : "standard",
          title: `Regulatory Update: ${change.title}`,
          headline: `Regulatory: ${change.title}`.slice(0, 120),
          summary: `${change.summary}\n\nWhat you need to do:\n${change.impact_description}`,
          status: "published",
          source_name: "evidly_internal",
          confidence_score: 0.90,
          affected_pillars: change.affected_pillars || [],
          raw_source_data: {
            changeId: change.id,
            sourceUrl: change.source_url,
            effectiveDate: change.effective_date,
            affectedPillars: change.affected_pillars,
            location_id: loc.id,
          },
        }));

        await supabase.from("intelligence_insights").insert(insights);
      }

      // Send email for critical/moderate changes
      if (
        change.impact_level !== "informational" &&
        affectedLocations.length > 0
      ) {
        const orgIds = [
          ...new Set(affectedLocations.map((l) => l.organization_id)),
        ];

        for (const orgId of orgIds) {
          const orgLocNames = affectedLocations
            .filter((l) => l.organization_id === orgId)
            .map((l) => l.name);

          // Queue email notification
          await supabase.from("notification_queue").insert({
            organization_id: orgId,
            channel: "email",
            subject: `Regulatory Update Affecting Your Kitchen: ${change.title}`,
            body: `${change.summary}\n\nWhat you need to do:\n${change.impact_description}\n\nAffected locations: ${orgLocNames.join(", ")}`,
            priority: change.impact_level === "critical" ? "high" : "normal",
          });
        }
      }

      // Mark as published
      await supabase
        .from("regulatory_changes")
        .update({
          published: true,
          published_at: new Date().toISOString(),
          affected_location_count: affectedLocations.length,
        })
        .eq("id", changeId);

      return jsonResponse({
        success: true,
        published: true,
        affected_locations: affectedLocations.length,
        affected_organizations: [
          ...new Set(affectedLocations.map((l) => l.organization_id)),
        ].length,
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("monitor-regulations error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal error" },
      500
    );
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
