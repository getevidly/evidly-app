/**
 * vendor-notification-sender — Daily cron (8 AM PT / 16:00 UTC)
 *
 * Sends operator notifications for:
 *  1. COI expiring in 30 days
 *  2. Service overdue (past due date)
 *  3. Certificate missing (7+ days after service with no cert on file)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const APP_URL = "https://app.getevidly.com";
const MAX_RUNTIME_MS = 50_000;

// ── Helper: escape HTML ──────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Helper: format date ──────────────────────────────────────────
function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── NFPA frequency labels ────────────────────────────────────────
const NFPA_FREQUENCIES: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annually: "Semi-Annually",
  annually: "Annually",
};

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const jobStart = Date.now();
    const isTimedOut = () => Date.now() - jobStart > MAX_RUNTIME_MS;

    const results = {
      coiWarnings: [] as { vendor: string; org: string }[],
      overdueAlerts: [] as { serviceType: string; location: string }[],
      certMissing: [] as { serviceType: string; location: string }[],
      errors: [] as string[],
      timedOut: false,
    };

    const now = new Date();

    // Fetch auth users once for email lookups
    const { data: authUsersData } = await supabase.auth.admin.listUsers();
    const authMap = new Map(
      (authUsersData?.users ?? []).map((u) => [u.id, u]),
    );

    // ═══════════════════════════════════════════════════
    // PHASE 1: COI Expiring in 30 Days
    // ═══════════════════════════════════════════════════

    const thirtyDaysOut = new Date(now);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const thirtyDaysStr = thirtyDaysOut.toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    // Find vendors with COI expiring within 30 days
    const { data: expiringCois } = await supabase
      .from("documents")
      .select(
        "id, organization_id, title, expiration_date, vendors(id, name)",
      )
      .eq("category", "certificate_of_insurance")
      .gte("expiration_date", todayStr)
      .lte("expiration_date", thirtyDaysStr)
      .is("coi_warning_sent_at", null);

    if (expiringCois && !isTimedOut()) {
      for (const doc of expiringCois) {
        if (isTimedOut()) { results.timedOut = true; break; }

        const vendorName = (doc as any).vendors?.name || "Unknown Vendor";
        const expirationDate = fmtDate(doc.expiration_date);

        // Get org managers/owners to notify
        const { data: orgUsers } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("organization_id", doc.organization_id)
          .in("role", ["owner_operator", "executive", "facilities_manager"]);

        if (orgUsers) {
          for (const user of orgUsers) {
            const authUser = authMap.get(user.id);
            if (!authUser?.email) continue;

            const html = buildEmailHtml({
              recipientName: user.full_name || "there",
              bodyHtml: `
                <p>EvidLY detected that the certificate of insurance on file for <strong>${esc(vendorName)}</strong> expires on <strong>${expirationDate}</strong> — 30 days from today.</p>
                <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="font-weight:600;margin:0 0 4px;color:#92400e;">An expired COI means:</p>
                  <ul style="color:#92400e;margin:0;padding-left:20px;line-height:1.8;">
                    <li>Your vendor is uninsured for work at your location</li>
                    <li>You may be liable for incidents during their service visits</li>
                    <li>Your carrier may flag this as a coverage gap</li>
                  </ul>
                </div>
                <p><strong>ACTION NEEDED:</strong> Request an updated COI from ${esc(vendorName)}.</p>
              `,
              ctaText: "View Vendor Record →",
              ctaUrl: `${APP_URL}/vendors`,
              urgencyBanner: { text: "COI Expiring Soon", color: "#f59e0b" },
              footerNote:
                "Advisory only. Consult your carrier and legal counsel for guidance specific to your situation.",
            });

            await sendEmail({
              to: authUser.email,
              subject: `${vendorName}'s certificate of insurance expires in 30 days`,
              html,
            });
          }
        }

        // Mark as sent to avoid re-sending
        await supabase
          .from("documents")
          .update({ coi_warning_sent_at: now.toISOString() })
          .eq("id", doc.id);

        results.coiWarnings.push({
          vendor: vendorName,
          org: doc.organization_id,
        });
      }
    }

    // ═══════════════════════════════════════════════════
    // PHASE 2: Service Overdue
    // ═══════════════════════════════════════════════════

    if (!isTimedOut()) {
      const { data: overdueServices } = await supabase
        .from("vendor_service_records")
        .select(
          "id, organization_id, service_type, service_due_date, nfpa_frequency, locations(name), vendors(name)",
        )
        .in("status", ["upcoming", "overdue"])
        .lt("service_due_date", todayStr)
        .is("overdue_notification_sent_at", null);

      if (overdueServices) {
        for (const record of overdueServices) {
          if (isTimedOut()) { results.timedOut = true; break; }

          const locationName =
            (record as any).locations?.name || "Unknown Location";
          const vendorName =
            (record as any).vendors?.name || "Unknown Vendor";
          const dueDate = new Date(record.service_due_date + "T00:00:00Z");
          const daysOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          const frequency =
            NFPA_FREQUENCIES[record.nfpa_frequency] ||
            record.nfpa_frequency ||
            "Per NFPA 96-2024";

          const { data: orgUsers } = await supabase
            .from("user_profiles")
            .select("id, full_name")
            .eq("organization_id", record.organization_id)
            .in("role", ["owner_operator", "executive", "facilities_manager"]);

          if (orgUsers) {
            for (const user of orgUsers) {
              const authUser = authMap.get(user.id);
              if (!authUser?.email) continue;

              const html = buildEmailHtml({
                recipientName: user.full_name || "there",
                bodyHtml: `
                  <p>EvidLY shows <strong>${esc(record.service_type)}</strong> at <strong>${esc(locationName)}</strong> is overdue.</p>
                  <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin:16px 0;">
                    <p style="margin:0 0 4px;color:#991b1b;"><strong>Last service:</strong> ${fmtDate(record.service_due_date)}</p>
                    <p style="margin:0 0 4px;color:#991b1b;"><strong>Due date:</strong> ${fmtDate(record.service_due_date)} (${daysOverdue} days ago)</p>
                    <p style="margin:0;color:#991b1b;"><strong>NFPA 96-2024 Table 12.4 frequency:</strong> ${esc(frequency)}</p>
                  </div>
                  <p>Overdue fire safety services may represent potential subrogation exposure. Consult your carrier for guidance.</p>
                `,
                ctaText: "Log a Service or Schedule →",
                ctaUrl: `${APP_URL}/vendors`,
                urgencyBanner: {
                  text: `Service ${daysOverdue} Days Overdue`,
                  color: "#dc2626",
                },
              });

              await sendEmail({
                to: authUser.email,
                subject: `${record.service_type} is overdue at ${locationName}`,
                html,
              });
            }
          }

          // Mark as notified
          await supabase
            .from("vendor_service_records")
            .update({ overdue_notification_sent_at: now.toISOString() })
            .eq("id", record.id);

          results.overdueAlerts.push({
            serviceType: record.service_type,
            location: locationName,
          });
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // PHASE 3: Certificate Missing (7+ days after service)
    // ═══════════════════════════════════════════════════

    if (!isTimedOut()) {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

      const { data: noCertRecords } = await supabase
        .from("vendor_service_records")
        .select(
          "id, organization_id, service_type, service_date, locations(name)",
        )
        .eq("status", "completed")
        .is("certificate_url", null)
        .lte("service_date", sevenDaysAgoStr)
        .is("cert_missing_notification_sent_at", null);

      if (noCertRecords) {
        for (const record of noCertRecords) {
          if (isTimedOut()) { results.timedOut = true; break; }

          const locationName =
            (record as any).locations?.name || "Unknown Location";

          const { data: orgUsers } = await supabase
            .from("user_profiles")
            .select("id, full_name")
            .eq("organization_id", record.organization_id)
            .in("role", ["owner_operator", "executive", "facilities_manager"]);

          if (orgUsers) {
            for (const user of orgUsers) {
              const authUser = authMap.get(user.id);
              if (!authUser?.email) continue;

              const html = buildEmailHtml({
                recipientName: user.full_name || "there",
                bodyHtml: `
                  <p>EvidLY shows a completed <strong>${esc(record.service_type)}</strong> service at <strong>${esc(locationName)}</strong> on ${fmtDate(record.service_date)} — but no certificate is on file.</p>
                  <p>Your service certificate is your proof of compliance. Upload it now to complete your record.</p>
                  <p style="color:#64748b;font-size:13px;">Takes 30 seconds. Drag and drop.</p>
                `,
                ctaText: "Upload Certificate →",
                ctaUrl: `${APP_URL}/vendors`,
              });

              await sendEmail({
                to: authUser.email,
                subject: `No certificate on file for ${record.service_type} at ${locationName}`,
                html,
              });
            }
          }

          // Mark as notified
          await supabase
            .from("vendor_service_records")
            .update({
              cert_missing_notification_sent_at: now.toISOString(),
            })
            .eq("id", record.id);

          results.certMissing.push({
            serviceType: record.service_type,
            location: locationName,
          });
        }
      }
    }

    return jsonResponse({ success: true, ...results });
  } catch (error) {
    logger.error("[VENDOR-NOTIFY] Fatal error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
