import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// This function runs on a cron schedule (daily) and:
// 1. Checks all vendor documents approaching expiration
// 2. Sends auto-requests to vendors with secure upload links
// 3. Sends reminders on day 4, 7, 14 for pending requests

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");
    const appUrl = Deno.env.get("APP_URL") || "https://app.getevidly.com";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = { newRequests: [], reminders: [], errors: [] as string[] };

    // Get all orgs with auto-request enabled
    const { data: orgSettings } = await supabase
      .from("auto_request_settings")
      .select("*, organizations(name)")
      .eq("enabled", true);

    if (!orgSettings || orgSettings.length === 0) {
      return jsonResponse({ message: "No orgs with auto-request enabled", ...results });
    }

    const now = new Date();

    for (const settings of orgSettings) {
      const orgId = settings.organization_id;
      const orgName = (settings as any).organizations?.name || "Your Client";

      // =============================================
      // PHASE 1: Check for documents approaching expiration
      // =============================================
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + settings.days_before_expiration);

      const { data: expiringDocs } = await supabase
        .from("documents")
        .select("*, vendors(id, name, email, phone, contact_name)")
        .eq("organization_id", orgId)
        .not("expiration_date", "is", null)
        .lte("expiration_date", targetDate.toISOString())
        .gte("expiration_date", now.toISOString());

      if (expiringDocs) {
        for (const doc of expiringDocs) {
          if (!doc.vendors?.id) continue;

          // Check if we already have a pending request for this doc
          const { data: existing } = await supabase
            .from("vendor_upload_requests")
            .select("id")
            .eq("vendor_id", doc.vendors.id)
            .eq("request_type", doc.category)
            .eq("organization_id", orgId)
            .in("status", ["pending", "sent"])
            .maybeSingle();

          if (existing) continue;

          // Create upload request with secure token
          const { data: requestResult, error: reqError } = await supabase
            .rpc("create_vendor_upload_request", {
              p_organization_id: orgId,
              p_vendor_id: doc.vendors.id,
              p_document_type: doc.category,
              p_description: `Auto-requested: ${doc.title} expiring ${doc.expiration_date}`,
              p_expires_days: settings.link_expires_days,
              p_vendor_email: doc.vendors.email,
              p_vendor_phone: doc.vendors.phone,
            });

          if (reqError) {
            results.errors.push(`Failed to create request for ${doc.title}: ${reqError.message}`);
            continue;
          }

          const uploadUrl = `${appUrl}/vendor/upload/${requestResult.token}`;

          // Send notification to vendor
          if (settings.notify_via === "email" || settings.notify_via === "both") {
            if (doc.vendors.email && resendApiKey) {
              await sendVendorEmail(resendApiKey, {
                to: doc.vendors.email,
                vendorName: doc.vendors.contact_name || doc.vendors.name,
                orgName,
                documentType: doc.title,
                expirationDate: doc.expiration_date,
                uploadUrl,
                isReminder: false,
                reminderNumber: 0,
              });
            }
          }

          if (settings.notify_via === "sms" || settings.notify_via === "both") {
            if (doc.vendors.phone && twilioSid && twilioToken && twilioFrom) {
              await sendVendorSms(twilioSid, twilioToken, twilioFrom, {
                to: doc.vendors.phone,
                vendorName: doc.vendors.contact_name || doc.vendors.name,
                orgName,
                documentType: doc.title,
                uploadUrl,
                isReminder: false,
              });
            }
          }

          // Log the auto-request
          await supabase.from("auto_request_log").insert({
            organization_id: orgId,
            vendor_id: doc.vendors.id,
            document_type: doc.category,
            trigger_reason: "expiration",
            days_until_expiration: Math.floor(
              (new Date(doc.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
            sent_via: settings.notify_via,
            secure_token_id: requestResult.token_id,
            upload_request_id: requestResult.request_id,
            reminder_number: 0,
          });

          (results.newRequests as any[]).push({
            vendor: doc.vendors.name,
            document: doc.title,
            token: requestResult.token,
          });
        }
      }

      // =============================================
      // PHASE 2: Send reminders for pending requests
      // =============================================
      const { data: pendingRequests } = await supabase
        .from("vendor_upload_requests")
        .select("*, vendors(id, name, email, phone, contact_name)")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .eq("auto_requested", true);

      if (pendingRequests) {
        for (const req of pendingRequests) {
          const createdDate = new Date(req.created_at);
          const daysSinceSent = Math.floor(
            (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          let shouldRemind = false;
          let reminderNumber = (req.reminder_count || 0) + 1;

          if (daysSinceSent >= 14 && settings.reminder_day_14 && req.reminder_count < 3) {
            shouldRemind = true;
          } else if (daysSinceSent >= 7 && settings.reminder_day_7 && req.reminder_count < 2) {
            shouldRemind = true;
          } else if (daysSinceSent >= 4 && settings.reminder_day_4 && req.reminder_count < 1) {
            shouldRemind = true;
          }

          // Don't remind more than once per day
          if (req.last_reminder_at) {
            const lastReminder = new Date(req.last_reminder_at);
            const hoursSinceReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60);
            if (hoursSinceReminder < 20) shouldRemind = false;
          }

          if (!shouldRemind) continue;

          const vendor = (req as any).vendors;
          if (!vendor) continue;

          const uploadUrl = `${appUrl}/vendor/upload/${req.secure_token}`;

          if (settings.notify_via === "email" || settings.notify_via === "both") {
            if (vendor.email && resendApiKey) {
              await sendVendorEmail(resendApiKey, {
                to: vendor.email,
                vendorName: vendor.contact_name || vendor.name,
                orgName,
                documentType: req.request_type,
                expirationDate: req.token_expires_at,
                uploadUrl,
                isReminder: true,
                reminderNumber,
              });
            }
          }

          if (settings.notify_via === "sms" || settings.notify_via === "both") {
            if (vendor.phone && twilioSid && twilioToken && twilioFrom) {
              await sendVendorSms(twilioSid, twilioToken, twilioFrom, {
                to: vendor.phone,
                vendorName: vendor.contact_name || vendor.name,
                orgName,
                documentType: req.request_type,
                uploadUrl,
                isReminder: true,
              });
            }
          }

          // Update reminder count
          await supabase
            .from("vendor_upload_requests")
            .update({
              reminder_count: reminderNumber,
              last_reminder_at: now.toISOString(),
            })
            .eq("id", req.id);

          // Log reminder
          await supabase.from("auto_request_log").insert({
            organization_id: orgId,
            vendor_id: vendor.id,
            document_type: req.request_type,
            trigger_reason: "reminder",
            sent_via: settings.notify_via,
            upload_request_id: req.id,
            reminder_number: reminderNumber,
          });

          (results.reminders as any[]).push({
            vendor: vendor.name,
            document: req.request_type,
            reminderNumber,
          });
        }
      }
    }

    return jsonResponse({ success: true, ...results });
  } catch (error) {
    console.error("Error in auto-request-documents:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

// =============================================
// Email via Resend
// =============================================
async function sendVendorEmail(
  apiKey: string,
  params: {
    to: string;
    vendorName: string;
    orgName: string;
    documentType: string;
    expirationDate: string;
    uploadUrl: string;
    isReminder: boolean;
    reminderNumber: number;
  }
) {
  const subject = params.isReminder
    ? `Reminder #${params.reminderNumber}: Document requested by ${params.orgName}`
    : `Document requested by ${params.orgName}`;

  const urgencyLine = params.isReminder && params.reminderNumber >= 3
    ? `<p style="color: #dc2626; font-weight: bold;">⚠ Final notice — upload link expires soon.</p>`
    : "";

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #1e4d6b; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
          <span style="color: #ffffff;">Evid</span><span style="color: #d4af37;">LY</span>
        </h1>
      </div>
      <div style="padding: 32px;">
        <p>Hi ${params.vendorName},</p>
        <p>${params.orgName} has requested the following document:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">${params.documentType}</p>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Expires: ${params.expirationDate}</p>
        </div>
        ${urgencyLine}
        <p>Click below to securely upload the document — no account needed:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.uploadUrl}" style="background: #1e4d6b; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Upload Document →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">This secure link is unique to you and will expire. Do not share it.</p>
      </div>
      <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        Powered by EvidLY — Compliance Simplified
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "EvidLY <noreply@getevidly.com>",
        to: [params.to],
        subject,
        html,
      }),
    });
    const data = await res.json();
    console.log(`[EMAIL] Sent to ${params.to}: ${subject}`, data);
    return data;
  } catch (err) {
    console.error(`[EMAIL] Failed to send to ${params.to}:`, err);
    throw err;
  }
}

// =============================================
// SMS via Twilio
// =============================================
async function sendVendorSms(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  params: {
    to: string;
    vendorName: string;
    orgName: string;
    documentType: string;
    uploadUrl: string;
    isReminder: boolean;
  }
) {
  const prefix = params.isReminder ? "REMINDER: " : "";
  const body = `${prefix}${params.orgName} is requesting your ${params.documentType}. Upload securely here: ${params.uploadUrl}`;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: params.to, From: fromNumber, Body: body }),
      }
    );
    const data = await res.json();
    console.log(`[SMS] Sent to ${params.to}`, data.sid);
    return data;
  } catch (err) {
    console.error(`[SMS] Failed to send to ${params.to}:`, err);
    throw err;
  }
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
