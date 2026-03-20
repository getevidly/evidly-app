import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { createNotification } from "../_shared/notify.ts";
import { logger } from "../_shared/logger.ts";

/**
 * vendor-document-reminders — VENDOR-COMPLIANCE-01
 *
 * Daily cron (7 AM UTC) — 7-stage expiry reminder engine.
 * Stages: 60d, 30d, 14d, 7d, 0d (expiry day), -1d, -7d past.
 *
 * For each unresolved expiry tracking row:
 * 1. Calculate days until expiration
 * 2. Match against stages, send reminders that haven't been sent
 * 3. Generate secure upload token for vendor re-upload
 * 4. Send email to vendor + in-app notification to client
 * 5. At -7d, mark vendor_document as expired
 */

const STAGES = [
  { days: 60,  column: "reminder_60d_sent_at",   urgency: "upcoming",  subject: "Upcoming Document Expiration" },
  { days: 30,  column: "reminder_30d_sent_at",   urgency: "upcoming",  subject: "Document Expiring in 30 Days" },
  { days: 14,  column: "reminder_14d_sent_at",   urgency: "action",    subject: "Action Required: Document Expiring Soon" },
  { days: 7,   column: "reminder_7d_sent_at",    urgency: "action",    subject: "Action Required: Document Expires in 7 Days" },
  { days: 0,   column: "reminder_0d_sent_at",    urgency: "expired",   subject: "EXPIRED: Document Has Expired Today" },
  { days: -1,  column: "reminder_neg1d_sent_at", urgency: "urgent",    subject: "URGENT: Expired Document — Immediate Action Required" },
  { days: -7,  column: "reminder_neg7d_sent_at", urgency: "urgent",    subject: "URGENT: Document Expired 7 Days Ago — Compliance Risk" },
] as const;

const URGENCY_COLORS: Record<string, string> = {
  upcoming: "#1e4d6b",
  action: "#c49a2b",
  expired: "#dc2626",
  urgent: "#991b1b",
};

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const values = crypto.getRandomValues(new Uint8Array(48));
  for (const v of values) {
    token += chars[v % chars.length];
  }
  return token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Allow manual override of target date for testing
    let targetDate = new Date();
    try {
      const body = await req.json();
      if (body?.date) targetDate = new Date(body.date);
    } catch {
      // No body — use today
    }

    const today = targetDate.toISOString().split("T")[0];

    // 1. Fetch all unresolved expiry tracking rows
    const { data: trackingRows, error: fetchError } = await supabase
      .from("vendor_document_expiry_tracking")
      .select(`
        *,
        vendor_documents!vendor_document_id (id, document_type, title, status, file_url),
        vendors!vendor_id (id, name, contact_name, contact_email)
      `)
      .eq("resolved", false);

    if (fetchError) {
      logger.error("Failed to fetch expiry tracking", { fetchError });
      return new Response(
        JSON.stringify({ error: "Failed to fetch tracking rows" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!trackingRows || trackingRows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No expiring documents found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;
    let totalProcessed = 0;

    for (const row of trackingRows) {
      totalProcessed++;

      const expirationDate = new Date(row.expiration_date + "T00:00:00Z");
      const todayDate = new Date(today + "T00:00:00Z");
      const daysUntilExpiry = Math.floor((expirationDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      const vendor = (row as any).vendors;
      const vendorDoc = (row as any).vendor_documents;

      if (!vendor || !vendorDoc) continue;

      for (const stage of STAGES) {
        // Check if we've hit this stage (days until expiry <= stage days)
        // and the reminder hasn't been sent yet
        if (daysUntilExpiry <= stage.days && !(row as any)[stage.column]) {
          const vendorEmail = vendor.contact_email;
          if (!vendorEmail) {
            logger.warn("No vendor contact email", { vendor_id: vendor.id, vendor_name: vendor.name });
            continue;
          }

          // Generate secure upload token
          const token = generateToken();
          const tokenExpiry = new Date();
          tokenExpiry.setDate(tokenExpiry.getDate() + 14); // 14-day token validity

          const { error: tokenError } = await supabase
            .from("vendor_secure_tokens")
            .insert({
              token,
              vendor_id: vendor.id,
              organization_id: row.organization_id,
              document_type: row.document_type,
              expires_at: tokenExpiry.toISOString(),
              upload_context: "document_expiry",
              expiry_tracking_id: row.id,
            });

          if (tokenError) {
            logger.error("Token creation failed", { tokenError, tracking_id: row.id });
            continue;
          }

          const uploadUrl = `https://app.getevidly.com/vendor/upload/${token}`;

          // Build email content
          const daysText = stage.days > 0
            ? `expires in ${stage.days} day${stage.days !== 1 ? "s" : ""}`
            : stage.days === 0
              ? "expires today"
              : `expired ${Math.abs(stage.days)} day${Math.abs(stage.days) !== 1 ? "s" : ""} ago`;

          const urgencyBanner = stage.urgency === "upcoming" ? undefined : {
            text: stage.days >= 0
              ? `Document ${daysText.toUpperCase()}`
              : `DOCUMENT ${daysText.toUpperCase()} — COMPLIANCE AT RISK`,
            color: URGENCY_COLORS[stage.urgency],
          };

          const emailHtml = buildEmailHtml({
            recipientName: vendor.contact_name || vendor.name,
            bodyHtml: `
              <p>Your <strong>${row.document_type}</strong> document ${daysText}.</p>
              <p>Please upload a current version of this document using the secure link below.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Document Type</td>
                  <td style="padding: 8px 0; font-weight: 600; font-size: 13px;">${row.document_type}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Expiration Date</td>
                  <td style="padding: 8px 0; font-weight: 600; font-size: 13px;">${row.expiration_date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Status</td>
                  <td style="padding: 8px 0; font-weight: 600; font-size: 13px; color: ${URGENCY_COLORS[stage.urgency]};">
                    ${stage.days > 0 ? "Expiring Soon" : stage.days === 0 ? "Expires Today" : "EXPIRED"}
                  </td>
                </tr>
              </table>
            `,
            ctaText: "Upload Updated Document",
            ctaUrl: uploadUrl,
            urgencyBanner,
            footerNote: "This link will expire in 14 days. If you need a new link, contact your client.",
          });

          await sendEmail({
            to: vendorEmail,
            subject: `${stage.subject} — ${row.document_type}`,
            html: emailHtml,
          });

          // In-app notification for client (compliance managers)
          const { data: clientUsers } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("organization_id", row.organization_id)
            .in("role", ["compliance_manager", "owner_operator"]);

          for (const user of (clientUsers || [])) {
            await createNotification({
              supabase,
              organizationId: row.organization_id,
              userId: user.id,
              type: "vendor_doc_expiry",
              category: "documents",
              title: stage.days >= 0
                ? `${vendor.name}: ${row.document_type} ${daysText}`
                : `${vendor.name}: ${row.document_type} ${daysText}`,
              body: `Vendor has been notified to re-upload.`,
              actionUrl: "/vendors/review",
              actionLabel: "View Documents",
              priority: stage.days <= 0 ? "high" : stage.days <= 7 ? "medium" : "low",
              severity: stage.days <= 0 ? "urgent" : "advisory",
              sourceType: "vendor_document_expiry",
              sourceId: `${row.id}_${stage.days}d`,
              deduplicate: true,
            });
          }

          // Update tracking row
          await supabase
            .from("vendor_document_expiry_tracking")
            .update({ [stage.column]: new Date().toISOString() })
            .eq("id", row.id);

          // At -7 days, also mark the vendor_document as expired
          if (stage.days === -7) {
            await supabase
              .from("vendor_documents")
              .update({ status: "expired" })
              .eq("id", row.vendor_document_id);
          }

          totalSent++;
          logger.info("Expiry reminder sent", {
            tracking_id: row.id,
            vendor: vendor.name,
            document_type: row.document_type,
            stage: stage.days,
            vendor_email: vendorEmail,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        reminders_sent: totalSent,
        date: today,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("vendor-document-reminders error", { error });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
