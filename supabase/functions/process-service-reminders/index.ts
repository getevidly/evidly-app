import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { sendSms } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Reminder cadence: 30 / 14 / 7 / 3 / 1 days before due ──────
const reminderWindows = [
  { daysOut: 30, label: "reminder_30d", emailType: "service_upcoming_30",  urgency: "low"    },
  { daysOut: 14, label: "reminder_14d", emailType: "service_upcoming_14",  urgency: "low"    },
  { daysOut: 7,  label: "reminder_7d",  emailType: "service_upcoming_7",   urgency: "medium" },
  { daysOut: 3,  label: "reminder_3d",  emailType: "service_upcoming_3",   urgency: "medium" },
  { daysOut: 1,  label: "reminder_1d",  emailType: "service_due_tomorrow", urgency: "high"   },
] as const;

// Column names for dedup — maps label → DB column
const sentAtColumn: Record<string, string> = {
  reminder_30d: "reminder_30d_sent_at",
  reminder_14d: "reminder_14d_sent_at",
  reminder_7d:  "reminder_7d_sent_at",
  reminder_3d:  "reminder_3d_sent_at",
  reminder_1d:  "reminder_1d_sent_at",
};

// ── Subject lines per window ────────────────────────────────────
function buildSubject(daysOut: number, locationName: string, serviceType: string): string {
  const templates: Record<number, string> = {
    30: `Upcoming Service Reminder \u2014 ${locationName} (${serviceType})`,
    14: `Service Due in 2 Weeks \u2014 ${locationName} \u2014 Please Confirm`,
    7:  `Service Due Next Week \u2014 ${locationName} \u2014 Action Required`,
    3:  `Service Due in 3 Days \u2014 ${locationName} \u2014 Please Confirm Schedule`,
    1:  `Service Due Tomorrow \u2014 ${locationName} \u2014 Upload Certificate After Completion`,
  };
  return templates[daysOut] || `Service Reminder \u2014 ${locationName}`;
}

// ── Urgency banner config ───────────────────────────────────────
function getUrgencyBanner(urgency: string): { text: string; color: string } | undefined {
  if (urgency === "medium") return { text: "Action Required \u2014 Service Approaching", color: "#f59e0b" };
  if (urgency === "high")   return { text: "Service Due Tomorrow \u2014 Act Now", color: "#dc2626" };
  return undefined; // low = no banner
}

// ── Build vendor reminder email body ────────────────────────────
function buildReminderBody(
  vendorName: string,
  serviceType: string,
  locationName: string,
  dueDate: string,
  daysOut: number,
  urgency: string,
  uploadUrl: string,
): string {
  const formattedDate = new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const daysLabel = daysOut === 1 ? "tomorrow" : `in ${daysOut} days`;

  let actionBlock = "";
  if (urgency === "high") {
    actionBlock = `
      <p style="color: #dc2626; font-weight: 600;">Please upload your service certificate after completing the job:</p>
    `;
  } else if (urgency === "medium") {
    actionBlock = `
      <p>Please confirm your appointment is scheduled. If you need to reschedule, contact your client as soon as possible.</p>
    `;
  } else {
    actionBlock = `
      <p>This is an early notice so you can plan ahead. Please ensure this service is scheduled.</p>
    `;
  }

  return `
    <p>You have a scheduled service due ${daysLabel} at <strong>${locationName}</strong>:</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="font-weight: 600; margin: 0 0 4px 0;">${serviceType}</p>
      <p style="color: #64748b; font-size: 14px; margin: 0;">Due: ${formattedDate}</p>
    </div>
    ${actionBlock}
  `;
}

// ── Batch processing constants ──────────────────────────────────
const BATCH_SIZE = 50;
const MAX_RUNTIME_MS = 50_000; // 50s hard stop (Edge Function limit ~60s)

// ── Main handler ────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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

    const results = {
      remindersSent: [] as { vendor: string; serviceType: string; window: string }[],
      overdueAlerts: [] as { vendor: string; serviceType: string; daysOverdue: number }[],
      dueTodayAlerts: [] as { serviceType: string; locationName: string }[],
      errors: [] as string[],
      timedOut: false,
    };

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // ═══════════════════════════════════════════════════
    // PHASE 1: Process upcoming service reminders (batched)
    // ═══════════════════════════════════════════════════

    let offset = 0;
    let hasMore = true;

    while (hasMore && !isTimedOut()) {
      const { data: upcomingBatch, error: fetchErr } = await supabase
        .from("vendor_service_records")
        .select("*, vendors(id, name, email, phone, contact_name), locations(name)")
        .eq("status", "upcoming")
        .gte("service_due_date", todayStr)
        .order("service_due_date", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchErr) {
        results.errors.push(`Failed to fetch upcoming records: ${fetchErr.message}`);
        break;
      }
      if (!upcomingBatch || upcomingBatch.length === 0) { hasMore = false; break; }

      for (const record of upcomingBatch) {
        if (isTimedOut()) { results.timedOut = true; break; }
        const vendor = (record as any).vendors;
        const locationName = (record as any).locations?.name || "Unknown Location";
        if (!vendor?.email) continue;

        const dueDate = new Date(record.service_due_date + "T00:00:00Z");
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Find the best matching window (largest daysOut that is >= daysUntilDue)
        for (const window of reminderWindows) {
          if (daysUntilDue > window.daysOut) continue; // not yet time for this window

          const col = sentAtColumn[window.label];
          if ((record as any)[col]) continue; // already sent for this window

          // Send vendor email
          const subject = buildSubject(window.daysOut, locationName, record.service_type);
          const urgencyBanner = getUrgencyBanner(window.urgency);
          const uploadUrl = `${appUrl}/vendor/upload`;

          const bodyHtml = buildReminderBody(
            vendor.contact_name || vendor.name,
            record.service_type,
            locationName,
            record.service_due_date,
            window.daysOut,
            window.urgency,
            uploadUrl,
          );

          const ctaText = window.urgency === "high"
            ? "Upload Certificate \u2192"
            : window.urgency === "medium"
            ? "Confirm Appointment \u2192"
            : "View Service Details \u2192";

          const html = buildEmailHtml({
            recipientName: vendor.contact_name || vendor.name,
            bodyHtml,
            ctaText,
            ctaUrl: uploadUrl,
            urgencyBanner,
            footerNote: "You received this because you have a scheduled service with an EvidLY client.",
          });

          await sendEmail({ to: vendor.email, subject, html });

          // Send SMS for medium/high urgency
          if (window.urgency !== "low" && vendor.phone) {
            const smsPrefix = window.urgency === "high" ? "URGENT: " : "";
            const smsBody = `${smsPrefix}${record.service_type} at ${locationName} is due ${
              window.daysOut === 1 ? "tomorrow" : `in ${window.daysOut} days`
            }. Please confirm your schedule. -EvidLY`;
            await sendSms({ to: vendor.phone, body: smsBody });
          }

          // Update sent_at column
          await supabase
            .from("vendor_service_records")
            .update({ [col]: now.toISOString(), updated_at: now.toISOString() })
            .eq("id", record.id);

          // Log to audit trail
          await supabase.from("vendor_service_reminder_log").insert({
            service_record_id: record.id,
            organization_id: record.organization_id,
            vendor_id: vendor.id,
            reminder_type: window.label,
            urgency: window.urgency,
            sent_via: window.urgency !== "low" && vendor.phone ? "both" : "email",
            recipient_type: "vendor",
          });

          results.remindersSent.push({
            vendor: vendor.name,
            serviceType: record.service_type,
            window: window.label,
          });

          // Only send the most applicable window per record per run
          break;
        }
      }

      offset += BATCH_SIZE;
      hasMore = upcomingBatch.length === BATCH_SIZE;
    }

    // ═══════════════════════════════════════════════════
    // PHASE 2: Due-today client alerts
    // ═══════════════════════════════════════════════════

    if (isTimedOut()) { results.timedOut = true; }

    if (!results.timedOut) {
    const { data: dueTodayRecords } = await supabase
      .from("vendor_service_records")
      .select("*, locations(name)")
      .eq("status", "upcoming")
      .eq("service_due_date", todayStr)
      .is("client_due_day_alert_at", null);

    if (dueTodayRecords) {
      for (const record of dueTodayRecords) {
        const locationName = (record as any).locations?.name || "Unknown Location";

        // Notify client org users (managers/owners)
        const { data: orgUsers } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("organization_id", record.organization_id)
          .in("role", ["owner", "admin", "manager"]);

        if (orgUsers) {
          const { data: authUsers } = await supabase.auth.admin.listUsers();

          for (const user of orgUsers) {
            const authUser = authUsers.users.find((u: any) => u.id === user.id);
            if (!authUser?.email) continue;

            const html = buildEmailHtml({
              recipientName: user.full_name || "there",
              bodyHtml: `
                <p>A vendor service is <strong>due today</strong> at <strong>${locationName}</strong>:</p>
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="font-weight: 600; margin: 0 0 4px 0; color: #92400e;">${record.service_type}</p>
                  <p style="color: #92400e; font-size: 14px; margin: 0;">Due: Today</p>
                </div>
                <p>Please verify the vendor arrives and completes the service. Request a certificate of completion.</p>
              `,
              ctaText: "View Equipment \u2192",
              ctaUrl: `${appUrl}/equipment`,
              urgencyBanner: { text: "Service Due Today", color: "#f59e0b" },
            });

            await sendEmail({
              to: authUser.email,
              subject: `Service Due Today \u2014 ${record.service_type} at ${locationName}`,
              html,
            });
          }
        }

        // Mark alert as sent
        await supabase
          .from("vendor_service_records")
          .update({ client_due_day_alert_at: now.toISOString(), updated_at: now.toISOString() })
          .eq("id", record.id);

        // Log
        await supabase.from("vendor_service_reminder_log").insert({
          service_record_id: record.id,
          organization_id: record.organization_id,
          vendor_id: record.vendor_id,
          reminder_type: "due_today",
          urgency: "medium",
          sent_via: "email",
          recipient_type: "client",
        });

        results.dueTodayAlerts.push({
          serviceType: record.service_type,
          locationName,
        });
      }
    }
    } // end Phase 2 timeout guard

    // ═══════════════════════════════════════════════════
    // PHASE 3: Overdue escalation at +7 days
    // ═══════════════════════════════════════════════════

    if (isTimedOut()) { results.timedOut = true; }

    if (!results.timedOut) {

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: overdueRecords } = await supabase
      .from("vendor_service_records")
      .select("*, vendors(id, name, email, phone, contact_name), locations(name)")
      .eq("status", "upcoming")
      .lte("service_due_date", sevenDaysAgoStr)
      .is("overdue_7d_alert_at", null);

    if (overdueRecords) {
      for (const record of overdueRecords) {
        const vendor = (record as any).vendors;
        const locationName = (record as any).locations?.name || "Unknown Location";

        const dueDate = new Date(record.service_due_date + "T00:00:00Z");
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // ── Vendor overdue email ──
        if (vendor?.email) {
          const html = buildEmailHtml({
            recipientName: vendor.contact_name || vendor.name,
            bodyHtml: `
              <p>A scheduled service is <strong>${daysOverdue} days overdue</strong>:</p>
              <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="font-weight: 600; margin: 0 0 4px 0; color: #991b1b;">${record.service_type}</p>
                <p style="color: #991b1b; font-size: 14px; margin: 0;">Was due: ${new Date(record.service_due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} (${daysOverdue} days overdue)</p>
              </div>
              <p>This service is overdue. Please upload documentation or contact your client to reschedule.</p>
            `,
            ctaText: "Upload Certificate \u2192",
            ctaUrl: `${appUrl}/vendor/upload`,
            urgencyBanner: { text: "OVERDUE \u2014 Immediate Action Required", color: "#7f1d1d" },
          });

          await sendEmail({
            to: vendor.email,
            subject: `OVERDUE: ${record.service_type} at ${locationName} \u2014 ${daysOverdue} Days Past Due`,
            html,
          });

          // Vendor SMS
          if (vendor.phone) {
            await sendSms({
              to: vendor.phone,
              body: `OVERDUE: ${record.service_type} at ${locationName} is ${daysOverdue} days past due. Please upload documentation or contact your client. -EvidLY`,
            });
          }
        }

        // ── Client overdue alert ──
        const { data: orgUsers } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("organization_id", record.organization_id)
          .in("role", ["owner", "admin", "manager"]);

        if (orgUsers) {
          const { data: authUsers } = await supabase.auth.admin.listUsers();

          for (const user of orgUsers) {
            const authUser = authUsers.users.find((u: any) => u.id === user.id);
            if (!authUser?.email) continue;

            const html = buildEmailHtml({
              recipientName: user.full_name || "there",
              bodyHtml: `
                <p>A vendor service is <strong>${daysOverdue} days overdue</strong> at <strong>${locationName}</strong>:</p>
                <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="font-weight: 600; margin: 0 0 4px 0; color: #991b1b;">${record.service_type}</p>
                  <p style="color: #991b1b; font-size: 14px; margin: 0;">${daysOverdue} days overdue</p>
                  <p style="color: #991b1b; font-size: 13px; margin: 4px 0 0;">Vendor: ${vendor?.name || "Unknown"}</p>
                </div>
                <p style="color: #dc2626; font-weight: 600;">Contact your vendor or schedule an alternative service provider.</p>
              `,
              ctaText: "View Equipment \u2192",
              ctaUrl: `${appUrl}/equipment`,
              urgencyBanner: { text: `Service ${daysOverdue} Days Overdue \u2014 Escalation`, color: "#dc2626" },
            });

            await sendEmail({
              to: authUser.email,
              subject: `OVERDUE: ${record.service_type} at ${locationName} \u2014 ${daysOverdue} Days Past Due`,
              html,
            });
          }
        }

        // Update record
        await supabase
          .from("vendor_service_records")
          .update({
            status: "overdue",
            overdue_7d_alert_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", record.id);

        // Log vendor notification
        await supabase.from("vendor_service_reminder_log").insert({
          service_record_id: record.id,
          organization_id: record.organization_id,
          vendor_id: record.vendor_id,
          reminder_type: "overdue_7d",
          urgency: "high",
          sent_via: vendor?.phone ? "both" : "email",
          recipient_type: "vendor",
        });

        // Log client notification
        await supabase.from("vendor_service_reminder_log").insert({
          service_record_id: record.id,
          organization_id: record.organization_id,
          vendor_id: record.vendor_id,
          reminder_type: "overdue_7d",
          urgency: "high",
          sent_via: "email",
          recipient_type: "client",
        });

        results.overdueAlerts.push({
          vendor: vendor?.name || "Unknown",
          serviceType: record.service_type,
          daysOverdue,
        });
      }
    }
    } // end Phase 3 timeout guard

    return jsonResponse({ success: true, ...results });
  } catch (error) {
    console.error("Error in process-service-reminders:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
