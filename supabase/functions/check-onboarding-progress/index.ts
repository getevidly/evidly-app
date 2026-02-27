import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** Days after signup when a reminder should be sent. */
const TRIGGER_DAYS = [3, 7, 14, 21, 28];

/** Minimum gap (days) between two consecutive reminders to the same user. */
const MIN_REMINDER_GAP_DAYS = 5;

/** Pillar labels keyed by document_type prefix (used in email grouping). */
const PILLAR_LABELS: Record<string, string> = {
  fire: "Facility Safety",
  food: "Food Safety",
  vendor: "Vendor Compliance",
  facility: "Facility & General",
};

/**
 * Map a document_type string to its pillar label.
 * Falls back to "Other" when no prefix matches.
 */
function pillarFor(documentType: string): string {
  const lower = documentType.toLowerCase();
  for (const [prefix, label] of Object.entries(PILLAR_LABELS)) {
    if (lower.startsWith(prefix)) return label;
  }
  return "Other";
}

Deno.serve(async (req: Request) => {
  // ── CORS pre-flight ────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "https://app.getevidly.com";
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!resendApiKey) {
      console.warn("[check-onboarding-progress] RESEND_API_KEY not set — aborting");
      return new Response(
        JSON.stringify({ message: "RESEND_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 1. Find users with incomplete onboarding ─────────────────
    const { data: incompleteUsers, error: usersError } = await supabase
      .from("user_profiles")
      .select("id, full_name, organization_id, first_login_at, onboarding_progress, last_onboarding_reminder_sent")
      .lt("onboarding_progress", 100)
      .is("onboarding_completed_at", null);

    if (usersError) throw usersError;

    if (!incompleteUsers || incompleteUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No incomplete onboarding users found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date();
    const remindersSent: Array<{
      userId: string;
      email: string;
      progress: number;
      missingCount: number;
      daysSinceSignup: number;
    }> = [];

    // Fetch auth users once (service role) to look up emails
    const { data: authUsersData } = await supabase.auth.admin.listUsers();
    const authUsersMap = new Map(
      (authUsersData?.users ?? []).map((u) => [u.id, u]),
    );

    for (const user of incompleteUsers) {
      // ── 2. Calculate days since signup ─────────────────────────
      const signupDate = user.first_login_at ? new Date(user.first_login_at) : null;
      if (!signupDate) continue; // no signup timestamp — skip

      const daysSinceSignup = Math.floor(
        (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // ── 3. Cooldown check ─────────────────────────────────────
      if (user.last_onboarding_reminder_sent) {
        const lastSent = new Date(user.last_onboarding_reminder_sent);
        const daysSinceLast = Math.floor(
          (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceLast < MIN_REMINDER_GAP_DAYS) continue;
      }

      // ── 4. Should we send today? ──────────────────────────────
      const shouldSend = TRIGGER_DAYS.some((d) => daysSinceSignup >= d);
      if (!shouldSend) continue;

      // Make sure we haven't already sent for this exact trigger window.
      // We use the highest qualifying trigger day as a simple dedup.
      const activeTrigger = [...TRIGGER_DAYS]
        .reverse()
        .find((d) => daysSinceSignup >= d);
      if (!activeTrigger) continue;

      // ── 5. Get missing documents ──────────────────────────────
      const { data: pendingDocs } = await supabase
        .from("onboarding_document_progress")
        .select("document_type")
        .eq("user_id", user.id)
        .eq("organization_id", user.organization_id)
        .eq("status", "pending");

      const missingDocs = pendingDocs ?? [];
      if (missingDocs.length === 0) continue; // nothing missing

      // ── 6. Resolve email address ──────────────────────────────
      const authUser = authUsersMap.get(user.id);
      if (!authUser?.email) continue;

      // ── 7. Build subject line ─────────────────────────────────
      const progress = user.onboarding_progress ?? 0;
      let subject: string;
      if (progress < 50) {
        subject =
          "Your compliance checklist is waiting \u2014 here\u2019s what\u2019s needed";
      } else if (progress < 75) {
        subject = `You\u2019re ${progress}% done \u2014 ${missingDocs.length} document${missingDocs.length === 1 ? "" : "s"} left to upload`;
      } else {
        subject =
          "Complete your setup to unlock your full compliance score";
      }

      // ── 8. Build HTML body ────────────────────────────────────
      const html = buildReminderHtml({
        name: user.full_name || "there",
        progress,
        missingDocs: missingDocs.map((d) => d.document_type),
        ctaUrl: `${appUrl}/onboarding/documents`,
      });

      // ── 9. Send via Resend ────────────────────────────────────
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "EvidLY <notifications@getevidly.com>",
          to: [authUser.email],
          subject,
          html,
        }),
      });

      const emailData = await emailRes.json();
      if (!emailRes.ok) {
        console.error(
          `[check-onboarding-progress] Resend error ${emailRes.status} for ${authUser.email}:`,
          emailData,
        );
        continue;
      }

      console.log(
        `[check-onboarding-progress] Sent reminder to ${authUser.email} (progress: ${progress}%, trigger: day ${activeTrigger})`,
        emailData.id,
      );

      // ── 10. Update last_onboarding_reminder_sent ──────────────
      await supabase
        .from("user_profiles")
        .update({ last_onboarding_reminder_sent: now.toISOString() })
        .eq("id", user.id);

      remindersSent.push({
        userId: user.id,
        email: authUser.email,
        progress,
        missingCount: missingDocs.length,
        daysSinceSignup,
      });
    }

    return new Response(
      JSON.stringify({ success: true, remindersSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[check-onboarding-progress] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// ── HTML email builder ────────────────────────────────────────────────────

interface ReminderEmailParams {
  name: string;
  progress: number;
  missingDocs: string[];
  ctaUrl: string;
}

function buildReminderHtml(params: ReminderEmailParams): string {
  const { name, progress, missingDocs, ctaUrl } = params;

  // Group missing documents by pillar
  const grouped: Record<string, string[]> = {};
  for (const doc of missingDocs) {
    const pillar = pillarFor(doc);
    if (!grouped[pillar]) grouped[pillar] = [];
    grouped[pillar].push(doc);
  }

  // Build pillar sections
  const pillarSections = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([pillar, docs]) => `
      <div style="margin-bottom: 16px;">
        <p style="font-weight: 600; color: #1e4d6b; margin: 0 0 6px 0; font-size: 14px;">${pillar}</p>
        <ul style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;">
          ${docs.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
        </ul>
      </div>`,
    )
    .join("");

  // Progress bar color
  const barColor = progress < 50 ? "#ef4444" : progress < 75 ? "#f59e0b" : "#22c55e";

  return `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #1e4d6b; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
      <span style="color: #ffffff;">Evid</span><span style="color: #d4af37;">LY</span>
    </h1>
  </div>

  <div style="padding: 32px;">
    <p style="color: #334155;">Hi ${escapeHtml(name)},</p>

    <p style="color: #334155;">
      Your onboarding checklist is <strong>${progress}% complete</strong>.
      ${missingDocs.length === 1 ? "There is <strong>1 document</strong> still needed" : `There are <strong>${missingDocs.length} documents</strong> still needed`}
      to finish your compliance setup.
    </p>

    <!-- Progress bar -->
    <div style="background: #e2e8f0; border-radius: 8px; height: 12px; margin: 20px 0; overflow: hidden;">
      <div style="background: ${barColor}; width: ${progress}%; height: 100%; border-radius: 8px; transition: width 0.3s;"></div>
    </div>
    <p style="text-align: right; font-size: 13px; color: #64748b; margin: -12px 0 20px 0;">${progress}% complete</p>

    <p style="color: #334155; font-weight: 600; margin-bottom: 8px;">Missing documents:</p>

    ${pillarSections}

    <div style="text-align: center; margin: 28px 0;">
      <a href="${ctaUrl}" style="background: #1e4d6b; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Complete Your Checklist &rarr;
      </a>
    </div>

    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
      Uploading your documents keeps your compliance record complete and audit-ready.
      You can manage notification preferences in your account settings.
    </p>
  </div>

  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    Powered by EvidLY &mdash; Compliance Simplified
  </div>
</div>`;
}

/** Basic HTML entity escaping for user-supplied text. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
