/**
 * Vendor Document Notification Edge Function
 *
 * Sends branded email notifications when vendor documents are uploaded,
 * updated, expiring, or require review.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface VendorDocNotifyPayload {
  recipientEmail: string;
  recipientName: string;
  notificationType:
    | "new_upload"
    | "updated"
    | "expiring_90"
    | "expiring_60"
    | "expiring_30"
    | "expiring_14"
    | "expired"
    | "review_required"
    | "review_completed"
    | "flagged";
  vendorName: string;
  documentType: string;
  documentTitle: string;
  facility?: string;
  uploadDate?: string;
  expirationDate?: string;
  status: string;
  reviewerName?: string;
  flagReason?: string;
  actionUrl: string;
}

function getSubject(payload: VendorDocNotifyPayload): string {
  const { notificationType, vendorName, documentType } = payload;

  switch (notificationType) {
    case "new_upload":
      return `New Document: ${documentType} from ${vendorName}`;
    case "updated":
      return `Updated Document: ${documentType} from ${vendorName}`;
    case "review_required":
      return `Review Required: ${documentType} from ${vendorName}`;
    case "review_completed":
      return `Document Reviewed: ${documentType} — ${vendorName}`;
    case "flagged":
      return `⚠ Document Flagged: ${documentType} — ${vendorName}`;
    case "expired":
      return `🚨 EXPIRED: ${documentType} — ${vendorName}`;
    case "expiring_14":
      return `⚠ Expiring Soon: ${documentType} — ${vendorName} (14 days)`;
    case "expiring_30":
      return `Expiring: ${documentType} — ${vendorName} (30 days)`;
    case "expiring_60":
      return `Expiring: ${documentType} — ${vendorName} (60 days)`;
    case "expiring_90":
      return `Upcoming Renewal: ${documentType} — ${vendorName} (90 days)`;
    default:
      return `Vendor Document Update: ${documentType} — ${vendorName}`;
  }
}

function getUrgencyBanner(
  notificationType: string,
): { text: string; color: string } | undefined {
  switch (notificationType) {
    case "expired":
      return {
        text: "DOCUMENT EXPIRED — Compliance gap detected",
        color: "#DC2626",
      };
    case "flagged":
      return {
        text: "DOCUMENT FLAGGED — Action required",
        color: "#DC2626",
      };
    case "expiring_14":
      return {
        text: "EXPIRING IN 14 DAYS — Renewal needed",
        color: "#F59E0B",
      };
    case "expiring_30":
      return {
        text: "EXPIRING IN 30 DAYS — Plan renewal",
        color: "#F59E0B",
      };
    default:
      return undefined;
  }
}

function buildBodyHtml(payload: VendorDocNotifyPayload): string {
  const rows: [string, string][] = [
    ["Vendor", payload.vendorName],
    ["Document Type", payload.documentType],
    ["Document", payload.documentTitle],
  ];

  if (payload.facility) rows.push(["Facility", payload.facility]);
  if (payload.uploadDate) rows.push(["Uploaded", payload.uploadDate]);
  if (payload.expirationDate) rows.push(["Expires", payload.expirationDate]);
  rows.push(["Status", payload.status]);
  if (payload.reviewerName) {
    rows.push(["Reviewed By", payload.reviewerName]);
  }

  const table = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;font-size:13px;color:#6B7F96;border-bottom:1px solid #E8EDF5">${label}</td><td style="padding:6px 12px;font-size:13px;color:#0B1628;font-weight:500;border-bottom:1px solid #E8EDF5">${value}</td></tr>`,
    )
    .join("");

  let flagNote = "";
  if (payload.notificationType === "flagged" && payload.flagReason) {
    flagNote = `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px;margin:16px 0;">
        <strong style="color:#991B1B;font-size:12px">Flag Reason:</strong>
        <p style="color:#7F1D1D;font-size:13px;margin:4px 0 0">${payload.flagReason}</p>
      </div>`;
  }

  return `
    <p style="color:#3D5068;font-size:14px">A vendor document requires your attention:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #E8EDF5;border-radius:8px">
      ${table}
    </table>
    ${flagNote}
  `;
}

function getCtaText(notificationType: string): string {
  switch (notificationType) {
    case "review_required":
    case "new_upload":
      return "Review Document";
    case "flagged":
      return "View Flagged Document";
    case "expired":
    case "expiring_14":
    case "expiring_30":
      return "View Document & Request Renewal";
    default:
      return "View Document";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const payload: VendorDocNotifyPayload = await req.json();

    if (!payload.recipientEmail || !payload.vendorName || !payload.documentType) {
      return jsonResponse(
        { error: "Missing required fields: recipientEmail, vendorName, documentType" },
        400,
      );
    }

    const subject = getSubject(payload);
    const bodyHtml = buildBodyHtml(payload);
    const urgencyBanner = getUrgencyBanner(payload.notificationType);
    const ctaText = getCtaText(payload.notificationType);

    const html = buildEmailHtml({
      recipientName: payload.recipientName || "Team",
      bodyHtml,
      ctaText,
      ctaUrl: payload.actionUrl,
      urgencyBanner,
      footerNote:
        "&copy; 2026 EvidLY &mdash; Lead with Confidence &mdash; Know Where You Stand",
    });

    const result = await sendEmail({
      to: payload.recipientEmail,
      subject,
      html,
    });

    return jsonResponse({
      success: true,
      emailId: result?.id || null,
    });
  } catch (error) {
    console.error("Error in vendor-document-notify:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
