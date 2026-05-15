import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOrgNotification } from "../_shared/notify.ts";
import { ensureThread, recordMessage } from "../_shared/threadMessage.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { buildReplyAddress } from "../_shared/replyAddress.ts";
import { logger } from "../_shared/logger.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleRow {
  id: string;
  organization_id: string;
  location_id: string;
  vendor_id: string | null;
  vendor_name: string | null;
  service_type_code: string;
  frequency_interval_days: number | null;
  last_service_date: string | null;
  next_due_date: string;
  deferred_until: string | null;
  locations: { id: string; name: string } | null;
  vendors: {
    id: string;
    company_name: string;
    email: string | null;
    primary_contact_email: string | null;
  } | null;
  organizations: { id: string; name: string } | null;
  service_type_definitions: { code: string; name: string; short_name: string } | null;
}

type Severity = "overdue" | "due_soon" | "vendor_lapse";

interface AlertEntry {
  schedule: ScheduleRow;
  severity: Severity;
  daysValue: number;
  serviceTypeName: string;
  serviceTypeShort: string;
  locationName: string;
  vendorName: string | null;
  vendorEmail: string | null;
  orgName: string;
}

interface DigestEntry {
  severity: Severity;
  serviceType: string;
  vendorName: string | null;
  locationName: string;
  daysValue: number;
  scheduleId: string;
  frequencyDays: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateDiffDays(a: string, b: string): number {
  const msA = new Date(a + "T00:00:00Z").getTime();
  const msB = new Date(b + "T00:00:00Z").getTime();
  return Math.floor((msA - msB) / 86_400_000);
}

const OPERATOR_ROLES = [
  "owner_operator",
  "executive",
  "compliance_manager",
  "facilities_manager",
];

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().slice(0, 10);
  const counters = { processed: 0, fired: 0, skipped_dedup: 0, errors: 0 };

  // ── 1. Fetch active schedules with joins ────────────────────────────────────

  const { data: schedules, error: fetchErr } = await supabase
    .from("location_service_schedules")
    .select(`
      id, organization_id, location_id, vendor_id, vendor_name,
      service_type_code, frequency_interval_days, last_service_date,
      next_due_date, deferred_until,
      locations!location_id (id, name),
      vendors!vendor_id (id, company_name, email, primary_contact_email),
      organizations!organization_id (id, name),
      service_type_definitions!service_type_code (code, name, short_name)
    `)
    .eq("is_active", true)
    .not("next_due_date", "is", null);

  if (fetchErr) {
    logger.error("[SERVICE-ALERT] Fetch error", fetchErr.message);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!schedules || schedules.length === 0) {
    logger.info("[SERVICE-ALERT] No active schedules with next_due_date");
    return new Response(JSON.stringify({ ...counters, message: "No active schedules" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 2. Classify each schedule ───────────────────────────────────────────────

  const alerts: AlertEntry[] = [];
  const orgDigests = new Map<string, DigestEntry[]>();

  for (const rawRow of schedules) {
    counters.processed++;
    const row = rawRow as unknown as ScheduleRow;

    // Skip deferred schedules
    if (row.deferred_until && row.deferred_until >= today) continue;

    const locationName = row.locations?.name || "Unknown location";
    const vendorName = row.vendors?.company_name || row.vendor_name || null;
    const vendorEmail = row.vendors?.email || row.vendors?.primary_contact_email || null;
    const orgName = row.organizations?.name || "Your organization";
    const serviceTypeName = row.service_type_definitions?.name || row.service_type_code;
    const serviceTypeShort = row.service_type_definitions?.short_name || serviceTypeName;

    let severity: Severity | null = null;
    let daysValue = 0;

    // Check vendor lapse first (highest severity, supersedes overdue/due_soon)
    if (row.frequency_interval_days) {
      const lapseBoundaryMs =
        new Date(today + "T00:00:00Z").getTime() -
        (row.frequency_interval_days + 60) * 86_400_000;
      const lapseBoundary = new Date(lapseBoundaryMs).toISOString().slice(0, 10);

      const { data: recentRecord } = await supabase
        .from("vendor_service_records")
        .select("id")
        .eq("location_id", row.location_id)
        .eq("service_type_code", row.service_type_code)
        .gte("service_date", lapseBoundary)
        .limit(1);

      if (!recentRecord || recentRecord.length === 0) {
        // Vendor lapse confirmed — compute days since last service
        const { data: lastRecord } = await supabase
          .from("vendor_service_records")
          .select("service_date")
          .eq("location_id", row.location_id)
          .eq("service_type_code", row.service_type_code)
          .order("service_date", { ascending: false })
          .limit(1);

        const lastDate = lastRecord?.[0]?.service_date || row.last_service_date;
        daysValue = lastDate
          ? dateDiffDays(today, lastDate)
          : row.frequency_interval_days + 60;
        severity = "vendor_lapse";
      }
    }

    // If not vendor_lapse, check overdue / due_soon
    if (!severity) {
      const diff = dateDiffDays(today, row.next_due_date);
      if (diff > 0) {
        severity = "overdue";
        daysValue = diff;
      } else if (diff >= -7) {
        severity = "due_soon";
        daysValue = Math.abs(diff);
      }
    }

    if (!severity) continue;

    alerts.push({
      schedule: row,
      severity,
      daysValue,
      serviceTypeName,
      serviceTypeShort,
      locationName,
      vendorName,
      vendorEmail,
      orgName,
    });

    // Accumulate for digest
    const orgId = row.organization_id;
    if (!orgDigests.has(orgId)) orgDigests.set(orgId, []);
    orgDigests.get(orgId)!.push({
      severity,
      serviceType: serviceTypeShort,
      vendorName,
      locationName,
      daysValue,
      scheduleId: row.id,
      frequencyDays: row.frequency_interval_days,
    });
  }

  // ── 3. Process alerts (dedupe + dispatch) ───────────────────────────────────

  for (const alert of alerts) {
    try {
      // Dedupe: check last fire for this (schedule_id, severity) within 23h
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 3_600_000).toISOString();
      const { data: recentFire } = await supabase
        .from("service_alert_log")
        .select("id")
        .eq("schedule_id", alert.schedule.id)
        .eq("severity", alert.severity)
        .gte("fired_at", twentyThreeHoursAgo)
        .limit(1);

      if (recentFire && recentFire.length > 0) {
        counters.skipped_dedup++;
        continue;
      }

      // ── In-app notification ─────────────────────────────────────────────────

      const notifTitle =
        alert.severity === "vendor_lapse"
          ? `Vendor lapse \u2014 ${alert.serviceTypeShort}`
          : alert.severity === "overdue"
            ? `${alert.serviceTypeShort} overdue`
            : `${alert.serviceTypeShort} due soon`;

      const notifBody =
        alert.severity === "vendor_lapse"
          ? `${alert.vendorName || "Vendor"} has not logged service at ${alert.locationName} in ${alert.daysValue} days. Cadence is every ${alert.schedule.frequency_interval_days} days.`
          : alert.severity === "overdue"
            ? `${alert.vendorName ? alert.vendorName + " \u00b7 " : ""}${alert.locationName} \u00b7 was due ${alert.daysValue} days ago`
            : `${alert.vendorName ? alert.vendorName + " \u00b7 " : ""}${alert.locationName} \u00b7 due in ${alert.daysValue} days`;

      const { count: notifCount } = await createOrgNotification({
        supabase,
        organizationId: alert.schedule.organization_id,
        type: "service_alert",
        category: "vendors",
        title: notifTitle,
        body: notifBody,
        actionUrl: "/vendors/services",
        actionLabel: "View Schedule",
        priority:
          alert.severity === "vendor_lapse" || alert.severity === "overdue"
            ? "high"
            : "medium",
        severity: alert.severity === "due_soon" ? "advisory" : "urgent",
        sourceType: "service_alert",
        sourceId: `${alert.schedule.id}_${alert.severity}`,
        deduplicate: true,
        roleFilter: OPERATOR_ROLES,
      });

      // Log in-app fire
      await supabase.from("service_alert_log").insert({
        organization_id: alert.schedule.organization_id,
        schedule_id: alert.schedule.id,
        severity: alert.severity,
        days_overdue: alert.daysValue,
        recipient_type: "operator_in_app",
        send_status: notifCount > 0 ? "sent" : "failed",
      });

      // ── Vendor email (overdue + vendor_lapse only) ──────────────────────────

      if (
        (alert.severity === "overdue" || alert.severity === "vendor_lapse") &&
        alert.vendorEmail
      ) {
        const emailSubject =
          alert.severity === "vendor_lapse"
            ? `Service lapse \u2014 ${alert.serviceTypeName} at ${alert.locationName}`
            : `Service overdue \u2014 ${alert.serviceTypeName} at ${alert.locationName}`;

        const thread = await ensureThread({
          supabase,
          organizationId: alert.schedule.organization_id,
          entityType: "service_schedule_alert",
          entityId: alert.schedule.id,
          subject: emailSubject,
        });

        const bodyHtml =
          alert.severity === "vendor_lapse"
            ? `<p>Our records show no logged service for <strong>${alert.serviceTypeName}</strong> at <strong>${alert.locationName}</strong> in the past ${alert.daysValue} days.</p>
               <p>The expected cadence is every ${alert.schedule.frequency_interval_days} days.</p>
               <p>If you have performed this service, please reply to this email with confirmation and we will update our records.</p>`
            : `<p>The scheduled <strong>${alert.serviceTypeName}</strong> service at <strong>${alert.locationName}</strong> was due on <strong>${alert.schedule.next_due_date}</strong> (${alert.daysValue} days ago).</p>
               ${alert.schedule.last_service_date ? `<p>Last service on record: ${alert.schedule.last_service_date}</p>` : ""}
               <p>If you have already performed this service, please reply to this email with confirmation and we will update our records.</p>`;

        const html = buildEmailHtml({
          recipientName: alert.vendorName || "there",
          bodyHtml,
          urgencyBanner: {
            text: alert.severity === "vendor_lapse" ? "Service Lapse" : "Service Overdue",
            color: "#dc2626",
          },
          footerNote:
            "Reply directly to this email \u2014 your response will be routed to the facility operator.",
        });

        let sendStatus: "sent" | "failed" = "failed";
        let errorMessage: string | null = null;
        let messageId: string | null = null;
        const threadId = thread?.id || null;

        if (thread) {
          const msg = await recordMessage({
            supabase,
            threadId: thread.id,
            organizationId: alert.schedule.organization_id,
            channel: "email",
            direction: "outbound",
            senderType: "system",
            senderIdentifier: "noreply@getevidly.com",
            subject: emailSubject,
            bodyHtml: html,
            bodyText: bodyHtml.replace(/<[^>]+>/g, ""),
          });
          messageId = msg?.id || null;

          const emailResult = await sendEmail({
            to: alert.vendorEmail,
            subject: emailSubject,
            html,
            replyTo: buildReplyAddress(thread.id),
          });

          sendStatus = emailResult ? "sent" : "failed";
          if (!emailResult) errorMessage = "Resend send failed";
        } else {
          errorMessage = "Thread creation failed";
        }

        await supabase.from("service_alert_log").insert({
          organization_id: alert.schedule.organization_id,
          schedule_id: alert.schedule.id,
          severity: alert.severity,
          days_overdue: alert.daysValue,
          recipient_type: "vendor_email",
          recipient_address: alert.vendorEmail,
          send_status: sendStatus,
          error_message: errorMessage,
          thread_id: threadId,
          message_id: messageId,
        });
      }

      counters.fired++;
    } catch (err) {
      counters.errors++;
      logger.error(
        "[SERVICE-ALERT] Per-schedule error",
        alert.schedule.id,
        (err as Error).message
      );
      await supabase
        .from("service_alert_log")
        .insert({
          organization_id: alert.schedule.organization_id,
          schedule_id: alert.schedule.id,
          severity: alert.severity,
          days_overdue: alert.daysValue,
          recipient_type: "operator_in_app",
          send_status: "failed",
          error_message: (err as Error).message,
        })
        .catch(() => {
          /* best-effort logging */
        });
    }
  }

  // ── 4. Operator digest emails ───────────────────────────────────────────────

  for (const [orgId, entries] of orgDigests) {
    try {
      // Skip empty digests
      if (entries.length === 0) continue;

      // Check if any alerts actually fired (not all deduped)
      const orgAlertsFired = alerts.some(
        (a) => a.schedule.organization_id === orgId
      );
      if (!orgAlertsFired) continue;

      // Get operator users for this org
      const { data: operators } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("organization_id", orgId)
        .in("role", OPERATOR_ROLES);

      if (!operators || operators.length === 0) continue;

      const totalAlerts = entries.length;
      const subject = `EvidLY: ${totalAlerts} service alert${totalAlerts !== 1 ? "s" : ""} this morning`;

      // Build digest body sections ordered by severity
      const severityOrder: Severity[] = ["vendor_lapse", "overdue", "due_soon"];
      const severityLabels: Record<Severity, string> = {
        vendor_lapse: "Vendor Lapse",
        overdue: "Overdue",
        due_soon: "Due Soon (7 days)",
      };
      const severityColors: Record<Severity, string> = {
        vendor_lapse: "#991b1b",
        overdue: "#dc2626",
        due_soon: "#d97706",
      };

      let sectionsHtml = "";
      for (const sev of severityOrder) {
        const sevEntries = entries.filter((e) => e.severity === sev);
        if (sevEntries.length === 0) continue;

        sectionsHtml += `<h3 style="color: ${severityColors[sev]}; font-size: 14px; margin: 20px 0 8px 0;">${severityLabels[sev]} (${sevEntries.length})</h3><ul style="margin: 0; padding-left: 20px;">`;
        for (const entry of sevEntries) {
          let detail: string;
          if (sev === "vendor_lapse") {
            detail = `${entry.vendorName || "Vendor"} \u00b7 ${entry.locationName} \u00b7 ${entry.daysValue} days since last service (cadence: ${entry.frequencyDays}d)`;
          } else if (sev === "overdue") {
            detail = `${entry.serviceType} \u00b7 ${entry.vendorName ? entry.vendorName + " \u00b7 " : ""}${entry.locationName} \u00b7 ${entry.daysValue} days overdue`;
          } else {
            detail = `${entry.serviceType} \u00b7 ${entry.vendorName ? entry.vendorName + " \u00b7 " : ""}${entry.locationName} \u00b7 due in ${entry.daysValue} days`;
          }
          sectionsHtml += `<li style="font-size: 13px; margin-bottom: 6px; color: #1E2D4D;">${detail}</li>`;
        }
        sectionsHtml += `</ul>`;
      }

      const digestHtml = buildEmailHtml({
        recipientName: "there",
        bodyHtml: `<p>Here\u2019s your morning service schedule summary:</p>${sectionsHtml}`,
        ctaText: "View Service Schedules",
        ctaUrl: "https://app.getevidly.com/vendors/services",
      });

      for (const op of operators) {
        const { data: userData } = await supabase.auth.admin.getUserById(op.id);
        if (!userData?.user?.email) continue;

        const result = await sendEmail({
          to: userData.user.email,
          subject,
          html: digestHtml,
        });

        // Log each schedule contribution for this operator
        for (const entry of entries) {
          await supabase.from("service_alert_log").insert({
            organization_id: orgId,
            schedule_id: entry.scheduleId,
            severity: entry.severity,
            days_overdue: entry.daysValue,
            recipient_type: "operator_email",
            recipient_address: userData.user.email,
            recipient_user_id: op.id,
            send_status: result ? "sent" : "failed",
            error_message: result ? null : "Digest email send failed",
          });
        }
      }
    } catch (err) {
      counters.errors++;
      logger.error("[SERVICE-ALERT] Digest error", orgId, (err as Error).message);
    }
  }

  logger.info("[SERVICE-ALERT] Complete", JSON.stringify(counters));
  return new Response(JSON.stringify(counters), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
