import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    const now = new Date();

    for (const org of orgs) {
      const { data: checklistItems } = await supabase
        .from("onboarding_checklist_items")
        .select("*")
        .eq("organization_id", org.id)
        .eq("is_enabled", true)
        .eq("is_required", true)
        .eq("category", "documents");

      if (!checklistItems || checklistItems.length === 0) continue;

      const { data: documents } = await supabase
        .from("documents")
        .select("*")
        .eq("organization_id", org.id);

      for (const item of checklistItems) {
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
              reminderCount
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
      JSON.stringify({ success: true, remindersSent }),
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
      JSON.stringify({ error: error.message }),
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
  reminderCount: number
) {
  const messages = {
    day_3: {
      subject: `Don't forget to upload your ${documentType}`,
    },
    day_7: {
      subject: `Reminder: ${documentType} still needed`,
    },
    day_14: {
      subject: `Final reminder: ${documentType} required for compliance`,
    },
  };

  const message = messages[reminderType as keyof typeof messages];

  console.log(`[EMAIL] Would send missing doc reminder to: ${email}`);
  console.log(`[EMAIL] Organization: ${orgName}`);
  console.log(`[EMAIL] Document type: ${documentType}`);
  console.log(`[EMAIL] Reminder type: ${reminderType}`);
  console.log(`[EMAIL] Reminder count: ${reminderCount + 1}`);
  console.log(`[EMAIL] Subject: ${message.subject}`);
}
