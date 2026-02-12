import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://app.getevidly.com";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, created_at, onboarding_completed")
      .eq("onboarding_completed", false);

    if (!orgs || orgs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No incomplete onboarding found" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const now = new Date();
    const emailsSent = [];

    for (const org of orgs) {
      const createdDate = new Date(org.created_at);
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let reminderType = null;
      if (daysSinceCreation >= 7) {
        reminderType = "day_7";
      } else if (daysSinceCreation >= 3) {
        reminderType = "day_3";
      } else if (daysSinceCreation >= 1) {
        reminderType = "day_1";
      }

      if (!reminderType) continue;

      const { data: existingReminder } = await supabase
        .from("onboarding_reminders")
        .select("id")
        .eq("organization_id", org.id)
        .eq("reminder_type", reminderType)
        .maybeSingle();

      if (existingReminder) continue;

      const { data: owners } = await supabase
        .from("user_profiles")
        .select("id, full_name, organizations(name)")
        .eq("organization_id", org.id)
        .in("role", ["owner", "admin"]);

      if (!owners || owners.length === 0) continue;

      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const ownerEmails = authUsers.users
        .filter((u) => owners.some((o) => o.id === u.id))
        .map((u) => u.email);

      for (const email of ownerEmails) {
        const owner = owners.find((o) =>
          authUsers.users.find((u) => u.id === o.id && u.email === email)
        );

        await sendReminderEmail(
          email!,
          owner?.full_name || "there",
          org.name,
          reminderType,
          appUrl
        );

        emailsSent.push({ email, org: org.name, type: reminderType });
      }

      await supabase.from("onboarding_reminders").insert({
        organization_id: org.id,
        reminder_type: reminderType,
      });
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending reminders:", error);
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

async function sendReminderEmail(
  email: string,
  name: string,
  orgName: string,
  reminderType: string,
  appUrl: string
) {
  const messages: Record<string, { subject: string; bodyHtml: string }> = {
    day_1: {
      subject: "Welcome to EvidLY - Let's finish your setup!",
      bodyHtml: `
        <p>You created your <strong>${orgName}</strong> account on EvidLY yesterday. Let's get you set up so your team can start tracking compliance right away.</p>
        <p>Here's what's left:</p>
        <ul style="color: #334155; line-height: 1.8;">
          <li>Add your locations</li>
          <li>Upload key documents (permits, licenses, insurance)</li>
          <li>Invite your team members</li>
        </ul>
      `,
    },
    day_3: {
      subject: "You're almost there - Complete your EvidLY setup",
      bodyHtml: `
        <p>It's been a few days since you created <strong>${orgName}</strong> on EvidLY. Your compliance dashboard is ready and waiting &mdash; just a few steps to go.</p>
        <p>Most teams finish setup in under 10 minutes. Pick up where you left off:</p>
      `,
    },
    day_7: {
      subject: "Your compliance dashboard is waiting - Complete setup",
      bodyHtml: `
        <p>Your <strong>${orgName}</strong> account on EvidLY has been waiting for a week. We don't want you to miss out on real-time compliance monitoring, automated checklists, and audit-ready documentation.</p>
        <p>Need help getting started? Reply to this email and our team will walk you through it.</p>
      `,
    },
  };

  const template = messages[reminderType] || messages.day_1;

  const html = buildEmailHtml({
    recipientName: name,
    bodyHtml: template.bodyHtml,
    ctaText: "Complete Setup →",
    ctaUrl: `${appUrl}/onboarding`,
    footerNote: "You're receiving this because you signed up for EvidLY. If this wasn't you, you can safely ignore this email.",
  });

  await sendEmail({ to: email, subject: template.subject, html });
}
