import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactRequest {
  vendor_id: string;
  contact_type: "email" | "sms";
  subject?: string;
  body: string;
  recipient_email?: string;
  recipient_phone?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Get user profile for org context
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*, organizations(name)")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return jsonResponse({ error: "User profile not found" }, 404);
    }

    const payload: ContactRequest = await req.json();

    if (!payload.vendor_id || !payload.contact_type || !payload.body) {
      return jsonResponse({ error: "Missing required fields: vendor_id, contact_type, body" }, 400);
    }

    // Verify vendor belongs to user's organization
    const { data: vendor } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", payload.vendor_id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!vendor) {
      return jsonResponse({ error: "Vendor not found" }, 404);
    }

    let externalId = null;
    let status = "sent";

    // Send via appropriate channel
    if (payload.contact_type === "email") {
      const recipientEmail = payload.recipient_email || vendor.email;
      if (!recipientEmail) {
        return jsonResponse({ error: "No email address for vendor" }, 400);
      }

      if (resendApiKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${profile.full_name} via EvidLY <noreply@getevidly.com>`,
              to: [recipientEmail],
              subject: payload.subject || `Message from ${(profile as any).organizations?.name || "Your Client"}`,
              html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #1e4d6b; padding: 16px 24px; text-align: center;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: bold;">Evid</span><span style="color: #d4af37; font-size: 20px; font-weight: bold;">LY</span>
                  </div>
                  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                    <p style="color: #64748b; font-size: 13px; margin-bottom: 16px;">
                      Message from ${profile.full_name} at ${(profile as any).organizations?.name}
                    </p>
                    <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #334155;">
                      ${payload.body.replace(/\n/g, "<br>")}
                    </div>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                    <p style="font-size: 12px; color: #94a3b8;">
                      Reply directly to this email or call ${user.email}
                    </p>
                  </div>
                </div>
              `,
              reply_to: user.email,
            }),
          });
          const data = await res.json();
          externalId = data.id;
          status = res.ok ? "sent" : "failed";
        } catch (err) {
          console.error("[EMAIL] Send failed:", err);
          status = "failed";
        }
      } else {
        console.log(`[EMAIL] Would send to ${recipientEmail}: ${payload.subject}`);
        console.log(`[EMAIL] Body: ${payload.body}`);
      }
    } else if (payload.contact_type === "sms") {
      const recipientPhone = payload.recipient_phone || vendor.phone;
      if (!recipientPhone) {
        return jsonResponse({ error: "No phone number for vendor" }, 400);
      }

      if (twilioSid && twilioToken && twilioFrom) {
        try {
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: recipientPhone,
                From: twilioFrom,
                Body: payload.body,
              }),
            }
          );
          const data = await res.json();
          externalId = data.sid;
          status = res.ok ? "sent" : "failed";
        } catch (err) {
          console.error("[SMS] Send failed:", err);
          status = "failed";
        }
      } else {
        console.log(`[SMS] Would send to ${recipientPhone}: ${payload.body}`);
      }
    }

    // Log the contact
    await supabase.from("vendor_contact_log").insert({
      organization_id: profile.organization_id,
      vendor_id: payload.vendor_id,
      contact_type: payload.contact_type,
      initiated_by: user.id,
      subject: payload.subject,
      body: payload.body,
      recipient_email: payload.recipient_email || vendor.email,
      recipient_phone: payload.recipient_phone || vendor.phone,
      status,
      external_id: externalId,
    });

    return jsonResponse({
      success: true,
      status,
      contact_type: payload.contact_type,
      external_id: externalId,
    });
  } catch (error) {
    console.error("Error in vendor-contact:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
