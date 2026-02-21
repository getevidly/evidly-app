import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Batch processing constants ──────────────────────────────────
const BATCH_SIZE = 50;
const MAX_RUNTIME_MS = 50_000; // 50s hard stop (Edge Function limit ~60s)

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Verify cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (expectedSecret && cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://app.getevidly.com";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const jobStart = Date.now();
    const isTimedOut = () => Date.now() - jobStart > MAX_RUNTIME_MS;

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name");

    if (!orgs || orgs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No organizations found" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const remindersSent = [];
    let timedOut = false;
    const now = new Date();

    for (const org of orgs) {
      if (isTimedOut()) { timedOut = true; break; }
      const { data: checklistItems } = await supabase
        .from("onboarding_checklist_items")
        .select("*")
        .eq("organization_id", org.id)
        .eq("is_enabled", true)
        .eq("is_required", true)
        .eq("category", "documents")
        .limit(BATCH_SIZE);

      if (!checklistItems || checklistItems.length === 0) continue;

      const { data: documents } = await supabase
        .from("documents")
        .select("*")
        .eq("organization_id", org.id)
        .limit(BATCH_SIZE);

      for (const item of checklistItems) {
        if (isTimedOut()) { timedOut = true; break; }
        const hasDoc = documents?.some(
          (doc) =>
            doc.title
              .toLowerCase()
              .includes(
                item.item_name.toLowerCase().split("(")[0].trim().toLowerCase()
              )
        );

        if (hasDoc) continue;

        const { data: existingReminder } = await supabase
          .from("document_reminders")
          .select("*")
          .eq("organization_id", org.id)
          .eq("document_type", item.item_name)
          .eq("dismissed", false)
          .maybeSingle();

        if (existingReminder?.snoozed_until) {
          const snoozeDate = new Date(existingReminder.snoozed_until);
          if (snoozeDate > now) continue;
        }

        let shouldSendReminder = false;
        let reminderType = null;
        const reminderCount = existingReminder?.reminder_count || 0;
        const lastSent = existingReminder?.last_sent_at
          ? new Date(existingReminder.last_sent_at)
          : null;

        if (!lastSent) {
          shouldSendReminder = true;
          reminderType = "day_3";
        } else {
          const daysSinceLastReminder = Math.floor(
            (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (reminderCount === 0 && daysSinceLastReminder >= 3) {
            shouldSendReminder = true;
            reminderType = "day_3";
          } else if (reminderCount === 1 && daysSinceLastReminder >= 4) {
            shouldSendReminder = true;
            reminderType = "day_7";
          } else if (reminderCount === 2 && daysSinceLastReminder >= 7) {
            shouldSendReminder = true;
            reminderType = "day_14";
          }
        }

        if (!shouldSendReminder) continue;

        const { data: orgUsers } = await supabase
          .from("user_profiles")
          .select("id, full_name, organizations(name)")
          .eq("organization_id", org.id)
          .in("role", ["owner", "admin", "manager"]);

        if (!orgUsers || orgUsers.length === 0) continue;

        const { data: authUsers } = await supabase.auth.admin.listUsers();

        for (const user of orgUsers) {
          const authUser = authUsers.users.find((u) => u.id === user.id);
          if (!authUser?.email) continue;

          const { data: settings } = await supabase
            .from("notification_settings")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          const shouldSendEmail = !settings || settings.email_enabled;

          if (shouldSendEmail) {
            await sendMissingDocEmail(
              authUser.email,
              user.full_name || "there",
              org.name,
              item.item_name,
              reminderType!,
              reminderCount,
              appUrl
            );

            remindersSent.push({
              email: authUser.email,
              org: org.name,
              document: item.item_name,
              type: reminderType,
            });
          }
        }

        if (existingReminder) {
          await supabase
            .from("document_reminders")
            .update({
              reminder_count: reminderCount + 1,
              last_sent_at: now.toISOString(),
            })
            .eq("id", existingReminder.id);
        } else {
          await supabase.from("document_reminders").insert({
            organization_id: org.id,
            document_type: item.item_name,
            reminder_count: 1,
            last_sent_at: now.toISOString(),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, remindersSent, timedOut }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending missing doc reminders:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function sendMissingDocEmail(
  email: string,
  name: string,
  orgName: string,
  documentType: string,
  reminderType: string,
  reminderCount: number,
  appUrl: string
) {
  const messages: Record<string, { subject: string; bodyHtml: string; urgency?: { text: string; color: string } }> = {
    day_3: {
      subject: `Don't forget to upload your ${documentType}`,
      bodyHtml: `
        <p>Your <strong>${orgName}</strong> compliance checklist requires the following document:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0;">${documentType}</p>
        </div>
        <p>Uploading this document keeps your compliance record complete and audit-ready.</p>
      `,
    },
    day_7: {
      subject: `Reminder: ${documentType} still needed`,
      bodyHtml: `
        <p>This is a reminder that <strong>${orgName}</strong> still needs the following document uploaded to stay compliant:</p>
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0; color: #92400e;">${documentType}</p>
          <p style="color: #92400e; font-size: 13px; margin: 4px 0 0 0;">This document is required for compliance.</p>
        </div>
      `,
      urgency: { text: "Action Required", color: "#f59e0b" },
    },
    day_14: {
      subject: `Final reminder: ${documentType} required for compliance`,
      bodyHtml: `
        <p>This is the <strong>final reminder</strong> that <strong>${orgName}</strong> is missing a required compliance document:</p>
        <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0; color: #991b1b;">${documentType}</p>
          <p style="color: #991b1b; font-size: 13px; margin: 4px 0 0 0;">Missing this document may affect your compliance score and audit readiness.</p>
        </div>
      `,
      urgency: { text: "Final Notice — Compliance at Risk", color: "#dc2626" },
    },
  };

  const template = messages[reminderType] || messages.day_3;

  const html = buildEmailHtml({
    recipientName: name,
    bodyHtml: template.bodyHtml,
    ctaText: "Upload Document →",
    ctaUrl: `${appUrl}/documents`,
    urgencyBanner: template.urgency,
    footerNote: `This is reminder ${reminderCount + 1} for ${orgName}. You can manage notification preferences in Settings.`,
  });

  await sendEmail({ to: email, subject: template.subject, html });
}
