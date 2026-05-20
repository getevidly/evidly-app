/**
 * send-daily-digest — Edge function
 * C10.5 of Dashboard v10 build sequence
 *
 * Cron-triggered (hourly UTC). Filters to orgs where local time = 7 AM.
 * For each user in eligible orgs:
 *   1. Load notification_preferences (per-category digest_opt_out)
 *   2. Query digest-eligible notifications from last 24h
 *   3. Render branded email via shared renderer
 *   4. Send via Resend (shared email.ts)
 *   5. Insert notification_deliveries row
 *
 * Event emitters NOT wired in C10.5 — this function processes whatever
 * notifications exist in the table from existing triggers.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";
import { renderDigestEmail } from "../_shared/notificationDigest/render.ts";
import type { DigestEvent } from "../_shared/notificationDigest/render.ts";

let corsHeaders = getCorsHeaders(null);

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Detect cron invocation ───────────────────────────────────
  const isCron =
    req.headers.get("x-evidly-cron-source") === "daily-digest";

  if (!isCron) {
    return jsonResponse(
      { error: "This function is cron-only. Use x-evidly-cron-source: daily-digest header." },
      403,
    );
  }

  return handleDigestCron(supabase);
});

// ── Main cron handler ──────────────────────────────────────────

async function handleDigestCron(
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const startTime = Date.now();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const summary = {
    orgs_checked: 0,
    orgs_skipped_not_7am: 0,
    orgs_skipped_no_tz: 0,
    users_processed: 0,
    users_skipped_no_events: 0,
    users_skipped_no_email: 0,
    events_delivered: 0,
    errors: [] as Array<{ org_id?: string; user_id?: string; message: string }>,
  };

  try {
    // Fetch all orgs
    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, timezone");

    if (orgErr) throw orgErr;
    if (!orgs?.length) {
      return jsonResponse({ ...summary, message: "No organizations found" });
    }

    for (const org of orgs) {
      summary.orgs_checked++;

      if (!org.timezone) {
        summary.orgs_skipped_no_tz++;
        continue;
      }

      if (!isSevenAm(org.timezone, now)) {
        summary.orgs_skipped_not_7am++;
        continue;
      }

      try {
        await processOrg(supabase, org, cutoff, now, summary);
      } catch (err) {
        summary.errors.push({
          org_id: org.id,
          message: (err as Error).message,
        });
      }
    }
  } catch (err) {
    summary.errors.push({ message: `Fatal: ${(err as Error).message}` });
    return jsonResponse(summary, 500);
  }

  const elapsed = Date.now() - startTime;
  logger.info(
    "[daily-digest]",
    `Complete: ${summary.orgs_checked} orgs, ${summary.users_processed} users, ` +
      `${summary.events_delivered} events delivered, ${summary.errors.length} errors, ${elapsed}ms`,
  );

  return jsonResponse({ ...summary, elapsed_ms: elapsed });
}

// ── Per-org processing ─────────────────────────────────────────

async function processOrg(
  supabase: ReturnType<typeof createClient>,
  org: { id: string; name: string; timezone: string },
  cutoff: string,
  _now: Date,
  summary: {
    users_processed: number;
    users_skipped_no_events: number;
    users_skipped_no_email: number;
    events_delivered: number;
    errors: Array<{ org_id?: string; user_id?: string; message: string }>;
  },
) {
  // Fetch users in this org with their email + name
  const { data: users, error: userErr } = await supabase
    .from("user_profiles")
    .select("id, full_name, organization_id")
    .eq("organization_id", org.id);

  if (userErr) throw userErr;
  if (!users?.length) return;

  // Get auth emails for these users
  const userIds = users.map((u: { id: string }) => u.id);
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const au of authUsers.users) {
      if (au.email && userIds.includes(au.id)) {
        emailMap.set(au.id, au.email);
      }
    }
  }

  for (const user of users) {
    try {
      const email = emailMap.get(user.id);
      if (!email) {
        summary.users_skipped_no_email++;
        continue;
      }

      await processUser(supabase, user, email, org, cutoff, summary);
    } catch (err) {
      summary.errors.push({
        org_id: org.id,
        user_id: user.id,
        message: (err as Error).message,
      });
    }
  }
}

// ── Per-user processing ────────────────────────────────────────

async function processUser(
  supabase: ReturnType<typeof createClient>,
  user: { id: string; full_name: string | null },
  email: string,
  org: { id: string; name: string; timezone: string },
  cutoff: string,
  summary: {
    users_processed: number;
    users_skipped_no_events: number;
    events_delivered: number;
    errors: Array<{ org_id?: string; user_id?: string; message: string }>;
  },
) {
  summary.users_processed++;

  // 1. Load user's notification_preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("category, email_enabled, digest_opt_out")
    .eq("user_id", user.id);

  // Determine digest-eligible categories:
  // - email_enabled must be true for the category (respects existing channel toggles)
  // - digest_opt_out must be false
  const eligibleCategories: string[] = [];
  if (prefs && prefs.length > 0) {
    for (const p of prefs) {
      if (p.email_enabled && !p.digest_opt_out) {
        eligibleCategories.push(p.category);
      }
    }
  } else {
    // No prefs = default all categories eligible
    eligibleCategories.push(
      "compliance", "safety", "documents", "vendors", "team", "system",
    );
  }

  if (eligibleCategories.length === 0) {
    summary.users_skipped_no_events++;
    return;
  }

  // 2. Query digest-eligible notifications from last 24h
  const { data: events, error: evErr } = await supabase
    .from("notifications")
    .select("id, title, body, action_url, severity, category, created_at")
    .eq("organization_id", org.id)
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq("digest_eligible", true)
    .is("acknowledged_at", null)
    .is("dismissed_at", null)
    .or("snoozed_until.is.null,snoozed_until.lt." + new Date().toISOString())
    .in("category", eligibleCategories)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(50);

  if (evErr) {
    summary.errors.push({
      org_id: org.id,
      user_id: user.id,
      message: `Query failed: ${evErr.message}`,
    });
    return;
  }

  if (!events || events.length === 0) {
    summary.users_skipped_no_events++;
    return;
  }

  // 3. Render email
  const digestEvents: DigestEvent[] = events.map(
    (e: {
      id: string;
      title: string;
      body: string | null;
      action_url: string | null;
      severity: string;
      category: string;
      created_at: string;
    }) => ({
      id: e.id,
      title: e.title,
      body: e.body,
      action_url: e.action_url,
      severity: e.severity || "info",
      category: e.category || "system",
      created_at: e.created_at,
    }),
  );

  const rendered = renderDigestEmail({
    recipientName: user.full_name || "there",
    orgName: org.name || "your organization",
    events: digestEvents,
    timezone: org.timezone,
  });

  // 4. Send via Resend
  const batchId = crypto.randomUUID();
  const result = await sendEmail({
    to: email,
    subject: rendered.subject,
    html: rendered.html,
  });

  // 5. Insert delivery record for each event
  const deliveryRows = digestEvents.map((ev) => ({
    notification_id: ev.id,
    channel: "email",
    recipient: email,
    status: result ? "sent" : "failed",
    provider_message_id: result?.id || null,
    failure_reason: result ? null : "Resend send failed",
    digest_batch_id: batchId,
    sent_at: result ? new Date().toISOString() : null,
  }));

  // Use upsert to handle potential re-runs (UNIQUE on notification_id+channel)
  const { error: delErr } = await supabase
    .from("notification_deliveries")
    .upsert(deliveryRows, { onConflict: "notification_id,channel" });

  if (delErr) {
    logger.warn(
      "[daily-digest]",
      `Delivery insert error for user ${user.id}: ${delErr.message}`,
    );
  }

  if (result) {
    summary.events_delivered += digestEvents.length;
  }
}

// ── Timezone helper (7 AM check) ─────────────────────────────

function isSevenAm(timezone: string, now: Date): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour");
    const hour = parseInt(hourPart?.value || "-1", 10);
    return hour === 7;
  } catch {
    logger.warn("[daily-digest]", `Invalid timezone: ${timezone}`);
    return false;
  }
}

// ── JSON response helper ─────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
