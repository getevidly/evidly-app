import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * intelligence-recategorize — one-off relabel of the catch-all categories.
 *
 * regulatory_updates and regulatory_change were the analyzer's catch-all. The
 * audit found the pool holds real fire/food/hood/FOG content alongside junk
 * that announces its own irrelevance. This pass sends each row's title and
 * summary to Claude and rewrites the category to its true value, so real
 * content re-enters correlation through the category that earns it and junk is
 * terminally held.
 *
 * Resumable by construction: the input set is "rows still carrying a catch-all
 * category". A rewritten row leaves the set, so re-invoking continues where the
 * last call stopped. Nothing is published, no correlations are written, and
 * status is never touched.
 *
 * Auth: Bearer token — service-role key or a platform_admin user.
 */

const CATCH_ALL = ["regulatory_updates", "regulatory_change"];

/** The ONLY values Claude may return. Anything else is treated as unparseable. */
const ALLOWED = new Set([
  "recall_alert",
  "outbreak_alert",
  "food_code_update",
  "nfpa_update",
  "fire_safety",
  "hood_cleaning",
  "ventilation",
  "grease_trap",
  "enforcement_surge",
  "food_handler",
  "legislative",
  "info",
  "not_applicable",
]);

const BATCH_SIZE = 15;
/** Batches per invocation — keeps a single call inside the edge runtime budget. */
const DEFAULT_BATCHES_PER_RUN = 3;

const SYSTEM_PROMPT = `You are classifying regulatory intelligence signals for EvidLY, a compliance platform for commercial kitchens.

Each signal gets exactly ONE category from this fixed list. Return no other value:

recall_alert · outbreak_alert · food_code_update · nfpa_update · fire_safety · hood_cleaning · ventilation · grease_trap · enforcement_surge · food_handler · legislative · info · not_applicable

Rules:
- not_applicable — the signal declares its own irrelevance ("NOT APPLICABLE", "not relevant to commercial kitchens"), covers non-kitchen consumer products, is an empty-scrape or bill-tracker artifact with no identified bill, or is a website-maintenance/outage notice.
- food_handler — food-manager or food-handler certification: ServSafe, CFPM, certification renewal or recertification deadlines.
- grease_trap or enforcement_surge — FOG (fats, oils, grease) and grease-trap content. Use grease_trap for requirements, maintenance and compliance mechanics; use enforcement_surge when the emphasis is active enforcement, citations, penalties or inspection sweeps.
- nfpa_update or hood_cleaning — hood, duct and NFPA 96 content. Use nfpa_update for standard or code revisions; use hood_cleaning for cleaning intervals, grease accumulation and service cadence.
- food_code_update — FDA Food Code, CalCode, California Retail Food Code / HSC Part 7 adoption or amendment.
- fire_safety — fire suppression, alarms, sprinklers, extinguishers not tied to a specific NFPA 96 revision.
- ventilation — kitchen ventilation and make-up air, including ASHRAE, where hood cleaning is not the subject.
- recall_alert — product or equipment recalls affecting kitchen operations.
- outbreak_alert — foodborne illness outbreaks, pathogen surveillance, contamination events.
- legislative — genuinely regulatory but general: pending bills, legislative sessions, statutory change with no specific operational subject above.
- info — genuinely regulatory or advisory but general, with no operational action for a kitchen.

Judge on substance, not on how urgent the title sounds. A title claiming kitchen relevance while the body describes an unrelated product is not_applicable.

Respond with ONLY a JSON array, no prose and no code fences. One object per input signal, in the same order:
[{"id":"<the id given>","category":"<one value from the list>"}]`;

interface Row {
  id: string;
  title: string | null;
  content_summary: string | null;
  category: string;
  routing_tier: string | null;
}

/** Extract the JSON array even if the model wrapped it in prose or fences. */
function parseArray(text: string): Array<{ id?: string; category?: string }> | null {
  const fenced = text.replace(/```(?:json)?/gi, "").trim();
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function classifyBatch(rows: Row[], apiKey: string): Promise<Map<string, string>> {
  const payload = rows.map((r) => ({
    id: r.id,
    title: r.title || "",
    summary: (r.content_summary || "").slice(0, 1200),
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: 4096,
      // Classification against a fixed list — low effort is the right depth and
      // keeps a 167-row one-off cheap.
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const body = await res.json();
  const text = (body.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  const parsed = parseArray(text);
  const out = new Map<string, string>();
  if (!parsed) {
    console.error(`[intelligence-recategorize] unparseable batch response: ${text.slice(0, 300)}`);
    return out; // every row in this batch counts as skipped
  }

  for (const item of parsed) {
    if (!item || typeof item.id !== "string" || typeof item.category !== "string") continue;
    const cat = item.category.trim().toLowerCase();
    if (!ALLOWED.has(cat)) {
      console.warn(`[intelligence-recategorize] rejected out-of-list value "${item.category}" for ${item.id}`);
      continue;
    }
    out.set(item.id, cat);
  }
  return out;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  // ── Auth ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  if (!bearer) return json({ error: "Unauthorized" }, 401);
  // The project issues both a legacy service_role JWT and an sb_secret_ key,
  // and SUPABASE_SERVICE_ROLE_KEY may hold either, so a string compare against
  // the env var alone rejects a legitimate service-role caller. Also accept a
  // token whose own role claim is service_role.
  const isServiceRole = bearer === serviceKey || (() => {
    try {
      const part = bearer.split(".")[1];
      if (!part) return false;
      const claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
      return claims.role === "service_role";
    } catch {
      return false;
    }
  })();

  if (!isServiceRole) {
    const asUser = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: prof } = await supabase
      .from("user_profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "platform_admin") return json({ error: "Admin access required" }, 403);
  }

  let batchesPerRun = DEFAULT_BATCHES_PER_RUN;
  try {
    const body = await req.json();
    if (body && Number.isInteger(body.batches) && body.batches > 0) batchesPerRun = body.batches;
  } catch { /* no body — use the default */ }

  let processed = 0;
  let skipped = 0;
  let heldNotApplicable = 0;
  const distribution: Record<string, number> = {};

  try {
    for (let b = 0; b < batchesPerRun; b++) {
      // Re-read each pass: rewritten rows have already left the input set.
      const { data: rows, error: readErr } = await supabase
        .from("intelligence_signals")
        .select("id, title, content_summary, category, routing_tier")
        .in("category", CATCH_ALL)
        .limit(BATCH_SIZE);

      if (readErr) return json({ error: `read failed: ${readErr.message}` }, 500);
      if (!rows || rows.length === 0) break;

      let verdicts: Map<string, string>;
      try {
        verdicts = await classifyBatch(rows as Row[], apiKey);
      } catch (err) {
        console.error("[intelligence-recategorize] classify failed:", err);
        // Stop this invocation rather than spin: the rows stay in the input set.
        return json({
          error: err instanceof Error ? err.message : String(err),
          processed, skipped, held_not_applicable: heldNotApplicable, distribution,
        }, 502);
      }

      for (const row of rows as Row[]) {
        const next = verdicts.get(row.id);
        if (!next) {
          skipped++;
          console.warn(`[intelligence-recategorize] skipped (no usable verdict): ${row.id} "${row.title}"`);
          continue;
        }

        const patch: Record<string, unknown> = { category: next };
        // Junk is terminally held. Every other routing_tier is left alone.
        if (next === "not_applicable") patch.routing_tier = "hold";

        const { error: updErr } = await supabase
          .from("intelligence_signals")
          .update(patch)
          .eq("id", row.id);

        if (updErr) {
          skipped++;
          console.error(`[intelligence-recategorize] update failed for ${row.id}: ${updErr.message}`);
          continue;
        }

        // Trail first-class: the pass is reversible from these rows alone.
        await supabase.from("admin_event_log").insert({
          level: "INFO",
          category: "signal_recategorized",
          message: `Recategorized "${(row.title || "").slice(0, 120)}": ${row.category} → ${next}`,
          metadata: {
            signal_id: row.id,
            from: row.category,
            to: next,
            routing_tier_from: row.routing_tier,
            routing_tier_to: next === "not_applicable" ? "hold" : row.routing_tier,
          },
        });

        processed++;
        distribution[next] = (distribution[next] || 0) + 1;
        if (next === "not_applicable") heldNotApplicable++;
      }
    }

    const { count: remaining } = await supabase
      .from("intelligence_signals")
      .select("id", { count: "exact", head: true })
      .in("category", CATCH_ALL);

    console.log(
      `[intelligence-recategorize] processed=${processed} skipped=${skipped} ` +
        `held=${heldNotApplicable} remaining=${remaining ?? "?"}`,
    );

    return json({
      success: true,
      processed,
      skipped,
      held_not_applicable: heldNotApplicable,
      distribution,
      remaining: remaining ?? null,
    });
  } catch (err) {
    console.error("[intelligence-recategorize] fatal:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
