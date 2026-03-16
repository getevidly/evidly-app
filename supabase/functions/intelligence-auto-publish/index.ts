import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

/**
 * intelligence-auto-publish — Cron-triggered auto-publisher
 *
 * Finds signals routed as "auto" where auto_publish_at <= now() and
 * publishes them, then triggers delivery to affected client orgs.
 *
 * Cron: hourly
 * [functions.intelligence-auto-publish]
 * verify_jwt = false
 * cron = "30 * * * *"   (every hour at :30)
 */

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Auth: cron secret or Supabase cron header
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const isCronSecret = expectedSecret && cronSecret === expectedSecret;
  const isCronTrigger = !cronSecret && req.headers.get("x-supabase-cron");

  if (!isCronSecret && !isCronTrigger) {
    // Also allow admin Bearer token
    const authHeader = req.headers.get("Authorization");
    let isAdmin = false;
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user } } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user?.email?.endsWith("@getevidly.com")) isAdmin = true;
    }
    if (!isAdmin) return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date().toISOString();
  const published: string[] = [];
  const errors: string[] = [];

  // ── Check routing mode ────────────────────────────────────
  const { data: modeSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "intelligence_routing_mode")
    .single();
  const routingMode = (modeSetting?.value as string) || "supervised";

  if (routingMode !== "autonomous") {
    console.log("[intelligence-auto-publish] Mode is 'supervised' — skipping auto-publish");
    return jsonResponse({ mode: routingMode, published: 0, message: "Supervised mode — no auto-publish" });
  }

  // ── Find signals ready to auto-publish ─────────────────────
  const { data: readySignals, error: fetchErr } = await supabase
    .from("intelligence_signals")
    .select("id, title, ai_urgency, severity_score, confidence_score, routing_reason, scope, risk_revenue, risk_liability, risk_cost, risk_operational")
    .eq("routing_tier", "auto")
    .eq("auto_published", false)
    .lte("auto_publish_at", now)
    .in("status", ["new", "analyzed"])
    .limit(20);

  if (fetchErr) {
    console.error("[intelligence-auto-publish] Fetch error:", fetchErr.message);
    return jsonResponse({ error: fetchErr.message }, 500);
  }

  if (!readySignals || readySignals.length === 0) {
    console.log("[intelligence-auto-publish] No signals ready for auto-publish");
    return jsonResponse({ published: 0, message: "No signals ready" });
  }

  console.log(`[intelligence-auto-publish] Found ${readySignals.length} signals to auto-publish`);

  for (const signal of readySignals) {
    try {
      // Mark as published
      const { error: updateErr } = await supabase
        .from("intelligence_signals")
        .update({
          status: "published",
          auto_published: true,
          published_at: now,
        })
        .eq("id", signal.id);

      if (updateErr) {
        errors.push(`${signal.id}: ${updateErr.message}`);
        continue;
      }

      // Log to auto-publish log
      await supabase.from("intelligence_auto_publish_log").insert({
        signal_id: signal.id,
        entity_type: "signal",
        entity_id: signal.id,
        routing_tier: "auto",
        severity_score: signal.severity_score,
        confidence_score: signal.confidence_score,
        action: "auto_published",
        details: { routing_reason: signal.routing_reason, title: signal.title },
      });

      // Trigger delivery (fire-and-forget)
      try {
        await supabase.functions.invoke("intelligence-deliver", {
          body: { type: "signal", id: signal.id },
        });
      } catch (deliverErr) {
        console.warn(`[intelligence-auto-publish] Delivery invocation failed for ${signal.id}:`, (deliverErr as Error).message);
      }

      published.push(signal.id);
    } catch (err) {
      errors.push(`${signal.id}: ${(err as Error).message}`);
    }
  }

  // ── Notify admin of auto-published signals ──────────────────
  if (published.length > 0) {
    try {
      const n = published.length;
      const bodyHtml = `
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          <strong>${n} intelligence signal${n === 1 ? "" : "s"}</strong>
          ${n === 1 ? "was" : "were"} auto-published by the routing engine.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Title</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Severity</th>
            </tr>
          </thead>
          <tbody>
            ${readySignals.filter(s => published.includes(s.id)).map(s => `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${(s.title || "").slice(0, 100)}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 12px;">${s.severity_score || 0}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p style="font-size: 13px; color: #94a3b8;">
          These signals were routed as low-risk / high-confidence and auto-published per your autonomous mode setting.
        </p>`;

      const html = buildEmailHtml({
        recipientName: "Arthur",
        bodyHtml,
        ctaText: "View Intelligence",
        ctaUrl: "https://app.getevidly.com/admin/intelligence",
        footerNote: "Auto-published by the EvidLY Intelligence Routing Engine.",
      });

      await sendEmail({
        to: "arthur@getevidly.com",
        subject: `EvidLY — ${n} signal${n === 1 ? "" : "s"} auto-published`,
        html,
      });
    } catch (emailErr) {
      console.warn("[intelligence-auto-publish] Email notification failed:", (emailErr as Error).message);
    }
  }

  console.log(`[intelligence-auto-publish] Done: published=${published.length} errors=${errors.length}`);

  return jsonResponse({
    published: published.length,
    errors,
    signal_ids: published,
  });
});
