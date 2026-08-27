import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * intelligence-digest — weekly per-org email of the signals that touched them.
 *
 * Runs Monday 15:00 UTC via pg_cron. Per organization:
 *   1. Collect published signals correlated to that org and not already in
 *      intelligence_digest_log. Zero remaining -> no email at all.
 *   2. Gate on trial phase + paying status -> full, teaser, or skip.
 *   3. Render and send to the three decision-maker roles.
 *   4. Log (org, signal) ONLY after Resend confirms, so a failed send retries.
 *
 * Auth: Bearer token. Service-role key (cron) or a platform_admin user.
 */

// ── Trial phase boundaries, in days from trial_start_date ───────────
const SETUP_ENDS_DAY = 15; // 0-15 setup
const USE_ENDS_DAY = 60; // 16-60 use, >60 lapsed

/**
 * Paying tiers — mirrors useFeatureAccess.ts:110 exactly:
 *   const isPaid = ['founder', 'standard', 'enterprise'].includes(plan);
 * No billing_subscriptions involvement; organizations.plan_tier is the source.
 * 'cpp_free' is deliberately absent — the CPP conversion audience is not paying.
 */
const PAID_TIERS = new Set(["founder", "standard", "enterprise"]);

// System/template orgs — same exclusion correlate-signal uses
const EXCLUDED_ORG_IDS = new Set([
  "00000000-0000-0000-0000-000000000001",
]);

const NAVY = "#1E2D4D";
const EMBER = "#B24A2E";
const CREAM = "#FAF7F0";
const INK = "#3D5068";
const MUTED = "#6B7F96";
const LINE = "#E6E1D3";

const APP_BASE = "https://app.getevidly.com";
const UPGRADE_URL = APP_BASE + "/upgrade";
const NOTIFICATION_SETTINGS_URL = APP_BASE + "/settings/notifications";

const CATEGORY_LABELS: Record<string, string> = {
  recall_alert: "Recall",
  recall: "Recall",
  outbreak_alert: "Outbreak",
  food_code_update: "Food Code Update",
  nfpa_update: "NFPA Update",
  fire_safety: "Fire Safety",
  hood_cleaning: "Hood Cleaning",
  ventilation: "Ventilation",
  grease_trap: "Grease Trap",
  enforcement_surge: "Enforcement",
};

interface Correlation {
  signal_id: string;
  match_type: string;
  match_reason: string | null;
  relevance_score: number | null;
}

interface Signal {
  id: string;
  title: string;
  content_summary: string | null;
  category: string | null;
  action_deadline: string | null;
}

interface Alert {
  signal: Signal;
  correlation: Correlation;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/** The chip shown first on each card — the reason this signal reached them. */
function relevanceChip(a: Alert): string {
  const reason = a.correlation.match_reason ? a.correlation.match_reason.trim() : "";
  if (a.correlation.match_type === "requirement" && reason) return reason;
  if (a.correlation.match_type === "county" && reason) {
    const m = reason.match(/in\s+(.+?)\s+County/i);
    return m ? m[1] + " County" : reason;
  }
  return CATEGORY_LABELS[a.signal.category || ""] || "National";
}

function chip(text: string, bg: string, color: string): string {
  return '<td style="padding:0 6px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:' +
    bg + ";color:" + color +
    ';font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px;font-family:Helvetica,Arial,sans-serif;white-space:nowrap;">' +
    esc(text) + "</td></tr></table></td>";
}

function alertCard(a: Alert, mode: "full" | "teaser"): string {
  const chips = [chip(relevanceChip(a), CREAM, NAVY)];
  if (a.signal.action_deadline) {
    chips.push(chip("Deadline · " + fmtDate(a.signal.action_deadline), "#F7E9E9", EMBER));
  }

  const fullBody =
    '<p style="margin:0 0 10px 0;color:' + INK +
    ';font-size:14px;line-height:1.6;font-family:Helvetica,Arial,sans-serif;">' +
    esc(a.signal.content_summary || "") + "</p>" +
    '<p style="margin:0;color:' + MUTED +
    ';font-size:12px;line-height:1.5;font-family:Helvetica,Arial,sans-serif;">Matched because ' +
    esc(a.correlation.match_reason || relevanceChip(a)) + ".</p>";

  const teaserBody =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px dashed ' +
    LINE + ';border-radius:8px;margin-top:4px;"><tr><td align="center" style="padding:18px 16px;">' +
    '<p style="margin:0 0 12px 0;color:' + MUTED +
    ';font-size:13px;font-family:Helvetica,Arial,sans-serif;">The detail for this alert is not included in your current plan.</p>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:' +
    EMBER + ';border-radius:6px;"><a href="' + UPGRADE_URL +
    '" style="display:inline-block;padding:10px 20px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;font-family:Helvetica,Arial,sans-serif;">Start Your Plan to Read</a>' +
    "</td></tr></table></td></tr></table>";

  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid ' +
    LINE + ';border-radius:10px;margin:0 0 14px 0;"><tr><td style="padding:16px 18px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;"><tr>' +
    chips.join("") + "</tr></table>" +
    '<p style="margin:0 0 8px 0;color:' + NAVY +
    ';font-size:16px;font-weight:700;line-height:1.4;font-family:Helvetica,Arial,sans-serif;">' +
    esc(a.signal.title) + "</p>" +
    (mode === "full" ? fullBody : teaserBody) +
    "</td></tr></table>";
}

function buildHtml(orgName: string, alerts: Alert[], mode: "full" | "teaser"): string {
  const n = alerts.length;
  const sentence = n + " " + (n === 1 ? "change" : "changes") + " touched your kitchen this week";

  const capNote = mode === "teaser"
    ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' +
      CREAM + ';border-radius:10px;margin:4px 0 18px 0;"><tr><td style="padding:16px 18px;">' +
      '<p style="margin:0;color:' + NAVY +
      ';font-size:13px;line-height:1.6;font-family:Helvetica,Arial,sans-serif;">Your 60-day window has ended. These alerts kept arriving because they touch your kitchen — the detail unlocks on any plan.</p>' +
      "</td></tr></table>"
    : "";

  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:' + CREAM + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' +
    CREAM + ';padding:24px 12px;"><tr><td align="center">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">' +

    // Header band
    '<tr><td style="background:' + NAVY + ';border-radius:10px 10px 0 0;padding:22px 24px;">' +
    '<p style="margin:0 0 4px 0;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:0.5px;font-family:Helvetica,Arial,sans-serif;">EvidLY</p>' +
    '<p style="margin:0;color:#C9D4E4;font-size:13px;font-family:Helvetica,Arial,sans-serif;">Kitchen intelligence for ' +
    esc(orgName) + "</p></td></tr>" +

    // Greeting + alerts
    '<tr><td style="background:#FFFFFF;padding:22px 24px 8px 24px;">' +
    '<p style="margin:0 0 18px 0;color:' + NAVY +
    ';font-size:16px;line-height:1.5;font-family:Helvetica,Arial,sans-serif;">' +
    esc(sentence) + ".</p>" +
    alerts.map((a) => alertCard(a, mode)).join("") +
    capNote +
    "</td></tr>" +

    // Footer
    '<tr><td style="background:#FFFFFF;border-radius:0 0 10px 10px;padding:4px 24px 22px 24px;border-top:1px solid ' +
    LINE + ';">' +
    '<p style="margin:16px 0 14px 0;color:' + MUTED +
    ";font-size:12px;line-height:1.6;font-family:Helvetica,Arial,sans-serif;\">Why you got this: EvidLY correlates regulatory and safety changes to your kitchen's county and the services you keep records for. You only receive what touches your operation.</p>" +
    '<p style="margin:0 0 6px 0;color:' + MUTED +
    ';font-size:12px;font-family:Helvetica,Arial,sans-serif;">EvidLY · a Cleaning Pros Plus, LLC company</p>' +
    '<p style="margin:0;font-size:12px;font-family:Helvetica,Arial,sans-serif;"><a href="' +
    NOTIFICATION_SETTINGS_URL + '" style="color:' + NAVY +
    ';text-decoration:underline;">Manage alert emails</a></p>' +
    "</td></tr>" +

    "</table></td></tr></table></body></html>";
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
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Auth: service-role (cron) or a platform_admin user ────────────
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  if (!bearer) return json({ error: "Unauthorized" }, 401);

  if (bearer !== serviceKey) {
    const asUser = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: prof } = await supabase
      .from("user_profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "platform_admin") {
      return json({ error: "Admin access required" }, 403);
    }
  }

  try {
    const { data: orgsRaw } = await supabase
      .from("organizations")
      .select("id, name, plan_tier, is_cpp_client, trial_start_date, industry_type");

    const orgs = (orgsRaw || []).filter(
      (o: Record<string, unknown>) =>
        !EXCLUDED_ORG_IDS.has(o.id as string) && o.industry_type !== "system",
    );

    const now = Date.now();
    let emailsSent = 0;
    let orgsFull = 0;
    let orgsTeaser = 0;
    const skipped: Record<string, number> = {
      no_new_signals: 0,
      setup_phase: 0,
      indeterminate_phase: 0,
      no_recipients: 0,
    };

    for (const org of orgs) {
      const orgId = org.id as string;

      // ── (a) Published signals correlated to this org ──────────────
      const { data: corrs } = await supabase
        .from("intelligence_correlations")
        .select(
          "signal_id, match_type, match_reason, relevance_score, intelligence_signals!inner(id, title, content_summary, category, action_deadline, is_published)",
        )
        .eq("organization_id", orgId)
        .eq("intelligence_signals.is_published", true);

      if (!corrs || corrs.length === 0) {
        skipped.no_new_signals++;
        continue;
      }

      const { data: alreadySent } = await supabase
        .from("intelligence_digest_log")
        .select("signal_id")
        .eq("organization_id", orgId);
      const sentIds = new Set(
        (alreadySent || []).map((r: { signal_id: string }) => r.signal_id),
      );

      // One signal renders once, carrying its highest-relevance correlation.
      const best = new Map<string, Alert>();
      for (
        const row of corrs as unknown as Array<
          Correlation & { intelligence_signals: Signal }
        >
      ) {
        if (sentIds.has(row.signal_id)) continue;
        const cur = best.get(row.signal_id);
        const score = row.relevance_score ?? 0;
        if (!cur || score > (cur.correlation.relevance_score ?? 0)) {
          best.set(row.signal_id, {
            signal: row.intelligence_signals,
            correlation: {
              signal_id: row.signal_id,
              match_type: row.match_type,
              match_reason: row.match_reason,
              relevance_score: row.relevance_score,
            },
          });
        }
      }

      const alerts = [...best.values()];
      // Never an empty digest.
      if (alerts.length === 0) {
        skipped.no_new_signals++;
        continue;
      }

      // ── (b) The gate ──────────────────────────────────────────────
      const paying = PAID_TIERS.has((org.plan_tier as string) || "");
      const start = org.trial_start_date as string | null;

      let mode: "full" | "teaser";
      if (paying) {
        // Paying overrides phase entirely.
        mode = "full";
      } else if (!start) {
        // Not paying and no trial clock: neither "in use" nor "lapsed" can be
        // asserted, so skip rather than guess at a phase.
        skipped.indeterminate_phase++;
        continue;
      } else {
        const days = Math.floor((now - new Date(start).getTime()) / 86400000);
        if (days <= SETUP_ENDS_DAY) {
          skipped.setup_phase++;
          continue;
        }
        mode = days <= USE_ENDS_DAY ? "full" : "teaser";
      }

      // ── (c) + (d) Render and send ─────────────────────────────────
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, full_name, role")
        .eq("organization_id", orgId)
        .in("role", ["owner_operator", "executive", "compliance_manager"]);

      if (!users || users.length === 0) {
        skipped.no_recipients++;
        continue;
      }

      const n = alerts.length;
      const subject = n + " " + (n === 1 ? "change" : "changes") +
        " touched your kitchen this week";
      const html = buildHtml((org.name as string) || "your kitchen", alerts, mode);

      let confirmed = false;
      for (const u of users) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(u.id);
          const email = authUser?.user?.email;
          if (!email) continue;
          const result = await sendEmail({ to: email, subject, html });
          if (result) {
            confirmed = true;
            emailsSent++;
          }
        } catch (err) {
          console.error(
            "[intelligence-digest] send error org=" + orgId + " user=" + u.id + ":",
            err,
          );
        }
      }

      // Log ONLY on a confirmed send — a failed send retries next run.
      if (confirmed) {
        await supabase.from("intelligence_digest_log").upsert(
          alerts.map((a) => ({
            organization_id: orgId,
            signal_id: a.signal.id,
            mode,
          })),
          { onConflict: "organization_id,signal_id" },
        );
        if (mode === "full") orgsFull++;
        else orgsTeaser++;
      } else {
        console.warn(
          "[intelligence-digest] no confirmed send for org=" + orgId +
            " — not logging, will retry",
        );
      }
    }

    console.log(
      "[intelligence-digest] emails=" + emailsSent + " full=" + orgsFull +
        " teaser=" + orgsTeaser + " skipped=" + JSON.stringify(skipped),
    );
    return json({
      success: true,
      emails_sent: emailsSent,
      orgs_full: orgsFull,
      orgs_teaser: orgsTeaser,
      skipped,
    });
  } catch (err) {
    console.error("[intelligence-digest] fatal:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
